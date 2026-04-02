# Infrastructure & Deploy Design — Cliente Fiel

**Date:** 2026-04-02
**Status:** Approved

---

## Overview

Full production infrastructure setup for Cliente Fiel SaaS, connecting frontend (Vercel), backend (Hetzner VPS), and DNS (Cloudflare) under the `riava.cl` domain.

---

## Architecture

```
riava.cl                        → Landing corporativa (Vercel)
clientefiel.riava.cl            → Frontend SaaS Next.js (Vercel)
api.clientefiel.riava.cl        → Backend FastAPI (Hetzner VPS)
```

---

## 1. DNS — Cloudflare

Domain: `riava.cl`

| Type  | Name              | Content                | Proxy  |
|-------|-------------------|------------------------|--------|
| A     | `riava.cl`        | `76.76.21.21`          | ON ✅  |
| CNAME | `www`             | `cname.vercel-dns.com` | ON ✅  |
| CNAME | `clientefiel`     | `cname.vercel-dns.com` | ON ✅  |
| A     | `api.clientefiel` | `46.225.154.115`       | OFF ✅ |

**Rules:**
- `api.clientefiel` must be DNS-only (proxy OFF) — Certbot requires direct server access for SSL certificate issuance.
- All Vercel domains use proxy ON for Cloudflare DDoS protection.

**Status:** All 4 records configured and verified. ✅

---

## 2. Hetzner VPS — Server Setup (one-time)

**Server:** `46.225.154.115` — Ubuntu 22.04 LTS

### Software Stack

| Component   | Role                                    |
|-------------|-----------------------------------------|
| Python 3.12 | Runtime                                 |
| venv        | Isolated Python environment             |
| uvicorn     | ASGI server (port 8000, internal only)  |
| nginx       | Reverse proxy + SSL termination         |
| Certbot     | Let's Encrypt SSL for `api.clientefiel.riava.cl` |
| PostgreSQL  | Primary database                        |
| Redis       | Celery broker + result backend          |

### Directory Structure

```
/var/www/clientefiel/
    backend/          ← git clone of repo (backend/ subdirectory)
    venv/             ← Python virtual environment
```

### Systemd Services

| Service              | Command                              | Role                    |
|----------------------|--------------------------------------|-------------------------|
| `finops-api`         | `uvicorn app.main:app --port 8000`   | FastAPI application     |
| `finops-celery`      | `celery -A app.tasks worker`         | Async task worker       |
| `finops-celery-beat` | `celery -A app.tasks beat`           | Periodic task scheduler |

All services run as `root` (or dedicated user), auto-start on boot, restart on failure.

### Nginx Configuration

- Listens on port 443 (HTTPS) for `api.clientefiel.riava.cl`
- Proxies to `localhost:8000`
- Redirects HTTP → HTTPS
- SSL certificate managed by Certbot (Let's Encrypt, auto-renewal via cron)

### PostgreSQL

- Database: `clientefiel`
- User: `clientefiel_user` with password
- Connection string: `postgresql+asyncpg://clientefiel_user:PASSWORD@localhost/clientefiel`

### Redis

- Runs on `localhost:6379`
- Internal access only (no external exposure)

### Environment Variables

Stored in `/var/www/clientefiel/backend/.env` — never committed to git.

| Variable                    | Description                              |
|-----------------------------|------------------------------------------|
| `ENVIRONMENT`               | `production`                             |
| `DATABASE_URL`              | PostgreSQL async connection string       |
| `REDIS_URL`                 | `redis://localhost:6379/0`               |
| `JWT_SECRET`                | Random 64-char string                    |
| `ENCRYPTION_KEY`            | Fernet key for WhatsApp token encryption |
| `FRONTEND_URL`              | `https://clientefiel.riava.cl`           |
| `META_APP_ID`               | Meta Business App ID                     |
| `META_APP_SECRET`           | Meta Business App Secret                 |
| `META_WEBHOOK_VERIFY_TOKEN` | Random string for webhook verification   |
| `STRIPE_SECRET_KEY`         | Stripe secret key                        |
| `STRIPE_WEBHOOK_SECRET`     | Stripe webhook signing secret            |
| `STRIPE_BASIC_PRICE_ID`     | Stripe price ID for Basic plan           |
| `STRIPE_MEDIUM_PRICE_ID`    | Stripe price ID for Medium plan          |
| `STRIPE_PREMIUM_PRICE_ID`   | Stripe price ID for Premium plan         |
| `CELERY_BROKER_URL`         | `redis://localhost:6379/0`               |
| `CELERY_RESULT_BACKEND`     | `redis://localhost:6379/0`               |

---

## 3. GitHub Actions — Automatic Deploy

**Trigger:** Push to `main` with changes in `backend/**`

**Replaces:** Current `deploy-backend.yml` which targets Railway.

### Deploy Flow

```
git push origin main
  → GitHub Actions runner
  → SSH into 46.225.154.115
  → cd /var/www/clientefiel/backend
  → git fetch origin && git reset --hard origin/main
  → source /var/www/clientefiel/venv/bin/activate
  → pip install -r requirements.txt (if changed)
  → alembic upgrade head
  → systemctl restart finops-api finops-celery finops-celery-beat
  → curl https://api.clientefiel.riava.cl/health → must return 200
```

### GitHub Secrets Required

| Secret            | Value                              |
|-------------------|------------------------------------|
| `SSH_HOST`        | `46.225.154.115`                   |
| `SSH_USER`        | `root`                             |
| `SSH_PRIVATE_KEY` | Private key matching server's `authorized_keys` |

**Status:** Secrets configured in GitHub. ✅

### SSH Key

- Type: `ed25519`
- Public key added to `/root/.ssh/authorized_keys` on server
- Private key stored as `SSH_PRIVATE_KEY` GitHub Secret

---

## 4. Vercel — Frontend

**Project:** `clientefiel` (currently at `cliente-fiel.vercel.app`)

### Custom Domain

Add `clientefiel.riava.cl` via Vercel Settings → Domains → Add Existing.
Cloudflare CNAME already configured — Vercel will validate automatically.

### Environment Variables

| Variable              | Value                                    |
|-----------------------|------------------------------------------|
| `NEXT_PUBLIC_API_URL` | `https://api.clientefiel.riava.cl`       |

### Deploy Trigger

Vercel auto-deploys on push to `main` (already connected to GitHub repo).
The existing `deploy-frontend.yml` GitHub Actions workflow can be kept or removed in favor of Vercel's native GitHub integration.

---

## 5. Pricing Plans

Billing is handled via Stripe. Prices are in USD (Stripe) with CLP reference for display.

| Plan       | Price USD | Price CLP   | Monthly booking limit | Stripe env var              |
|------------|-----------|-------------|----------------------|-----------------------------|
| Básico     | $22 USD   | $20.000 CLP | 100 citas/mes        | `STRIPE_BASIC_PRICE_ID`     |
| Intermedio | $42 USD   | $40.000 CLP | 300 citas/mes        | `STRIPE_MEDIUM_PRICE_ID`    |
| Premium    | $102 USD  | $100.000 CLP| 500 citas/mes        | `STRIPE_PREMIUM_PRICE_ID`   |

### Trial Period

- Every new tenant gets a **14-day free trial** on signup — no credit card required.
- At day 14, the trial expires automatically.
- A WhatsApp + email notification is sent at day 13 (reminder) and day 14 (expiry).
- On expiry the account is **suspended** (read-only, no new bookings, no WhatsApp sends).
- A prompt is shown in the dashboard asking the tenant to choose a plan and subscribe.
- If no plan is contracted within 7 days of suspension, the account remains suspended until payment.

### Booking Limit Enforcement

- The system tracks `bookings_this_month` per tenant (reset on billing cycle start).
- When the limit is reached, new booking attempts return `HTTP 402` with message indicating the plan limit.
- Dashboard shows current usage: e.g. "87 / 100 citas este mes".
- Upgrading a plan takes effect immediately.

---

## 6. Deploy Workflow Summary

### Backend (automatic)
```bash
git add -A
git commit -m "feat: ..."
git push origin main
# → GitHub Actions SSHes into Hetzner and deploys automatically
```

### Frontend (automatic)
```bash
git add -A
git commit -m "feat: ..."
git push origin main
# → Vercel detects changes in frontend/ and deploys automatically
```

---

## Implementation Order

1. Server provisioning (packages, PostgreSQL, Redis, directories)
2. Clone repo + virtualenv + `.env` file
3. Systemd services (`finops-api`, `finops-celery`, `finops-celery-beat`)
4. Nginx reverse proxy configuration
5. Certbot SSL for `api.clientefiel.riava.cl`
6. Run Alembic migrations
7. Smoke test: `curl https://api.clientefiel.riava.cl/health`
8. Update `deploy-backend.yml` for SSH deploy
9. Vercel: add domain + environment variable
10. Create Stripe products + price IDs for the 3 plans
11. End-to-end test: push → auto-deploy → health check

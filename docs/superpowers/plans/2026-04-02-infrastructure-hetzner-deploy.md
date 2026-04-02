# Infrastructure & Deploy — Hetzner VPS Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure Hetzner VPS (Ubuntu 22.04) to run the FastAPI backend in production, with automatic deploys via GitHub Actions on every push to `main`, exposed at `https://api.clientefiel.riava.cl`.

**Architecture:** Python 3.12 + virtualenv + uvicorn running behind nginx as reverse proxy. SSL via Certbot (Let's Encrypt). Three systemd services: `finops-api` (uvicorn), `finops-celery` (worker), `finops-celery-beat` (scheduler). GitHub Actions SSHes into the server on each push to pull changes, install dependencies, run migrations, and restart services.

**Tech Stack:** Ubuntu 22.04, Python 3.12, uvicorn, nginx, Certbot, PostgreSQL 14, Redis, systemd, GitHub Actions

---

## Pre-requisites (already done)

- DNS: `api.clientefiel.riava.cl` → `46.225.154.115` (Cloudflare, proxy OFF) ✅
- SSH key: public key in `/root/.ssh/authorized_keys` on server ✅
- GitHub Secrets: `SSH_HOST`, `SSH_USER`, `SSH_PRIVATE_KEY` ✅

---

## File Structure

**Files to modify:**
- `.github/workflows/deploy-backend.yml` — replace Railway deploy with SSH deploy

**Files to create on server** (via SSH, not committed to git):
- `/etc/systemd/system/finops-api.service`
- `/etc/systemd/system/finops-celery.service`
- `/etc/systemd/system/finops-celery-beat.service`
- `/etc/nginx/sites-available/clientefiel-api`
- `/var/www/clientefiel/backend/.env`

---

## Task 1: Install System Packages

**Where:** SSH session on server (`ssh root@46.225.154.115`)

- [ ] **Step 1: Update system**

```bash
apt update && apt upgrade -y
```

Expected: packages updated, no errors.

- [ ] **Step 2: Install Python 3.12 and tools**

```bash
apt install -y python3.12 python3.12-venv python3.12-dev python3-pip git curl
```

Verify:
```bash
python3.12 --version
```
Expected: `Python 3.12.x`

- [ ] **Step 3: Install nginx and certbot**

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Verify:
```bash
nginx -v
```
Expected: `nginx version: nginx/1.x.x`

- [ ] **Step 4: Commit (nothing to commit — server config only)**

No git commit needed. Server state is documented in this plan.

---

## Task 2: PostgreSQL Setup

**Where:** SSH session on server

- [ ] **Step 1: Install PostgreSQL**

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql
```

Verify:
```bash
systemctl status postgresql | grep "active (running)"
```

- [ ] **Step 2: Create database and user**

```bash
sudo -u postgres psql <<EOF
CREATE USER clientefiel_user WITH PASSWORD 'CHOOSE_A_STRONG_PASSWORD_HERE';
CREATE DATABASE clientefiel OWNER clientefiel_user;
GRANT ALL PRIVILEGES ON DATABASE clientefiel TO clientefiel_user;
EOF
```

Replace `CHOOSE_A_STRONG_PASSWORD_HERE` with a real password (save it — you'll need it for the `.env` file).

- [ ] **Step 3: Verify connection**

```bash
psql -U clientefiel_user -d clientefiel -h localhost -c "SELECT version();"
```

Expected: PostgreSQL version string printed, no errors.

---

## Task 3: Redis Setup

**Where:** SSH session on server

- [ ] **Step 1: Install Redis**

```bash
apt install -y redis-server
```

- [ ] **Step 2: Enable and start Redis**

```bash
systemctl enable redis-server
systemctl start redis-server
```

- [ ] **Step 3: Verify Redis**

```bash
redis-cli ping
```

Expected: `PONG`

---

## Task 4: Clone Repo and Create Virtualenv

**Where:** SSH session on server

- [ ] **Step 1: Create app directory**

```bash
mkdir -p /var/www/clientefiel
cd /var/www/clientefiel
```

- [ ] **Step 2: Clone repository**

```bash
git clone https://github.com/finopslatam-sudo/ClienteFiel.git repo
cd repo
```

- [ ] **Step 3: Create virtual environment**

```bash
python3.12 -m venv /var/www/clientefiel/venv
```

- [ ] **Step 4: Install Python dependencies**

```bash
source /var/www/clientefiel/venv/bin/activate
pip install --upgrade pip
pip install -r /var/www/clientefiel/repo/backend/requirements.txt
```

Expected: all packages installed, no errors.

- [ ] **Step 5: Verify FastAPI app loads**

```bash
cd /var/www/clientefiel/repo/backend
source /var/www/clientefiel/venv/bin/activate
python -c "from app.main import app; print('OK')"
```

Expected: `OK` — if it prints errors about missing env vars, that's expected at this point (`.env` not created yet). If it prints import errors, fix those first.

---

## Task 5: Create .env File

**Where:** SSH session on server

- [ ] **Step 1: Create .env**

```bash
cat > /var/www/clientefiel/repo/backend/.env <<'EOF'
ENVIRONMENT=production
DATABASE_URL=postgresql+asyncpg://clientefiel_user:YOUR_DB_PASSWORD@localhost/clientefiel
REDIS_URL=redis://localhost:6379/0
JWT_SECRET=GENERATE_64_CHAR_RANDOM_STRING
JWT_ALGORITHM=HS256
JWT_ACCESS_TOKEN_EXPIRE_MINUTES=30
JWT_REFRESH_TOKEN_EXPIRE_DAYS=7
FRONTEND_URL=https://clientefiel.riava.cl
META_APP_ID=YOUR_META_APP_ID
META_APP_SECRET=YOUR_META_APP_SECRET
META_WEBHOOK_VERIFY_TOKEN=GENERATE_RANDOM_STRING
ENCRYPTION_KEY=GENERATE_FERNET_KEY
STRIPE_SECRET_KEY=sk_live_YOUR_STRIPE_SECRET
STRIPE_WEBHOOK_SECRET=whsec_YOUR_STRIPE_WEBHOOK_SECRET
STRIPE_BASIC_PRICE_ID=price_YOUR_BASIC_PRICE_ID
STRIPE_MEDIUM_PRICE_ID=price_YOUR_MEDIUM_PRICE_ID
STRIPE_PREMIUM_PRICE_ID=price_YOUR_PREMIUM_PRICE_ID
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
EOF
```

Replace each `YOUR_*` and `GENERATE_*` value:

- `YOUR_DB_PASSWORD` → the password you chose in Task 2
- `GENERATE_64_CHAR_RANDOM_STRING` → run: `python3 -c "import secrets; print(secrets.token_hex(32))"`
- `GENERATE_RANDOM_STRING` → run: `python3 -c "import secrets; print(secrets.token_urlsafe(32))"`
- `GENERATE_FERNET_KEY` → run: `python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`
- Stripe and Meta values → from your Stripe Dashboard and Meta Developer Console

- [ ] **Step 2: Secure the file**

```bash
chmod 600 /var/www/clientefiel/repo/backend/.env
```

- [ ] **Step 3: Verify settings load**

```bash
cd /var/www/clientefiel/repo/backend
source /var/www/clientefiel/venv/bin/activate
python -c "from app.core.config import settings; print(settings.environment)"
```

Expected: `production`

---

## Task 6: Run Alembic Migrations

**Where:** SSH session on server

- [ ] **Step 1: Run migrations**

```bash
cd /var/www/clientefiel/repo/backend
source /var/www/clientefiel/venv/bin/activate
alembic upgrade head
```

Expected: output ending in `Running upgrade -> 90d34ba2e8aa, initial schema` (no errors).

- [ ] **Step 2: Verify tables exist**

```bash
psql -U clientefiel_user -d clientefiel -h localhost -c "\dt"
```

Expected: list of tables (tenants, users, bookings, etc.) printed.

---

## Task 7: Systemd Services

**Where:** SSH session on server

- [ ] **Step 1: Create finops-api service**

```bash
cat > /etc/systemd/system/finops-api.service <<'EOF'
[Unit]
Description=Cliente Fiel FastAPI
After=network.target postgresql.service redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/clientefiel/repo/backend
Environment="PATH=/var/www/clientefiel/venv/bin"
EnvironmentFile=/var/www/clientefiel/repo/backend/.env
ExecStart=/var/www/clientefiel/venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF
```

- [ ] **Step 2: Create finops-celery service**

```bash
cat > /etc/systemd/system/finops-celery.service <<'EOF'
[Unit]
Description=Cliente Fiel Celery Worker
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/clientefiel/repo/backend
Environment="PATH=/var/www/clientefiel/venv/bin"
EnvironmentFile=/var/www/clientefiel/repo/backend/.env
ExecStart=/var/www/clientefiel/venv/bin/celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

- [ ] **Step 3: Create finops-celery-beat service**

```bash
cat > /etc/systemd/system/finops-celery-beat.service <<'EOF'
[Unit]
Description=Cliente Fiel Celery Beat Scheduler
After=network.target redis-server.service

[Service]
Type=simple
User=root
WorkingDirectory=/var/www/clientefiel/repo/backend
Environment="PATH=/var/www/clientefiel/venv/bin"
EnvironmentFile=/var/www/clientefiel/repo/backend/.env
ExecStart=/var/www/clientefiel/venv/bin/celery -A app.tasks.celery_app beat --loglevel=info
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
```

- [ ] **Step 4: Enable and start all services**

```bash
systemctl daemon-reload
systemctl enable finops-api finops-celery finops-celery-beat
systemctl start finops-api finops-celery finops-celery-beat
```

- [ ] **Step 5: Verify all services running**

```bash
systemctl status finops-api --no-pager | grep "active (running)"
systemctl status finops-celery --no-pager | grep "active (running)"
systemctl status finops-celery-beat --no-pager | grep "active (running)"
```

Expected: all three lines show `active (running)`.

- [ ] **Step 6: Verify API responds on localhost**

```bash
curl http://127.0.0.1:8000/health
```

Expected: `{"status":"ok","environment":"production"}`

---

## Task 8: Nginx Reverse Proxy

**Where:** SSH session on server

- [ ] **Step 1: Create nginx site config**

```bash
cat > /etc/nginx/sites-available/clientefiel-api <<'EOF'
server {
    listen 80;
    server_name api.clientefiel.riava.cl;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 10s;
    }
}
EOF
```

- [ ] **Step 2: Enable the site**

```bash
ln -s /etc/nginx/sites-available/clientefiel-api /etc/nginx/sites-enabled/
nginx -t
```

Expected: `nginx: configuration file /etc/nginx/nginx.conf test is successful`

- [ ] **Step 3: Reload nginx**

```bash
systemctl reload nginx
```

- [ ] **Step 4: Verify HTTP works (before SSL)**

```bash
curl http://api.clientefiel.riava.cl/health
```

Expected: `{"status":"ok","environment":"production"}`

---

## Task 9: SSL with Certbot

**Where:** SSH session on server

- [ ] **Step 1: Obtain SSL certificate**

```bash
certbot --nginx -d api.clientefiel.riava.cl --non-interactive --agree-tos --email YOUR_EMAIL@riava.cl
```

Replace `YOUR_EMAIL@riava.cl` with your real email. Certbot will automatically update the nginx config to handle HTTPS and HTTP→HTTPS redirect.

Expected: output ending in `Congratulations! Your certificate and chain have been saved`.

- [ ] **Step 2: Verify HTTPS**

```bash
curl https://api.clientefiel.riava.cl/health
```

Expected: `{"status":"ok","environment":"production"}`

- [ ] **Step 3: Verify auto-renewal is configured**

```bash
systemctl status certbot.timer | grep "active"
```

Expected: `active (waiting)` — Certbot renews certificates automatically twice daily.

---

## Task 10: Update GitHub Actions Deploy Workflow

**Where:** Local machine, then `git push`

- [ ] **Step 1: Replace deploy-backend.yml**

Replace the entire content of `.github/workflows/deploy-backend.yml` with:

```yaml
name: Deploy Backend

on:
  push:
    branches: [main]
    paths:
      - "backend/**"
      - ".github/workflows/deploy-backend.yml"

jobs:
  deploy:
    name: Deploy to Hetzner VPS
    runs-on: ubuntu-latest

    steps:
      - name: Deploy via SSH
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.SSH_HOST }}
          username: ${{ secrets.SSH_USER }}
          key: ${{ secrets.SSH_PRIVATE_KEY }}
          script: |
            set -e
            cd /var/www/clientefiel/repo
            git fetch origin
            git reset --hard origin/main
            source /var/www/clientefiel/venv/bin/activate
            pip install -q -r backend/requirements.txt
            cd backend
            alembic upgrade head
            systemctl restart finops-api finops-celery finops-celery-beat
            sleep 3
            curl -sf https://api.clientefiel.riava.cl/health || exit 1
            echo "Deploy successful"
```

- [ ] **Step 2: Commit and push**

```bash
git add .github/workflows/deploy-backend.yml
git commit -m "chore: update deploy workflow to SSH into Hetzner VPS"
git push origin main
```

- [ ] **Step 3: Verify GitHub Actions run**

Go to `github.com/finopslatam-sudo/ClienteFiel` → Actions tab → watch the "Deploy Backend" workflow run.

Expected: workflow completes with green checkmark, last step shows `Deploy successful`.

---

## Task 11: Vercel — Domain and Environment Variable

**Where:** Vercel Dashboard (`vercel.com`) — no code changes needed.

- [ ] **Step 1: Add custom domain**

1. Open Vercel → project `clientefiel` → Settings → Domains
2. Click **Add Existing**
3. Type `clientefiel.riava.cl` and save
4. Wait for status to show **Valid Configuration** (Cloudflare CNAME already set)

- [ ] **Step 2: Add environment variable**

1. Vercel → project `clientefiel` → Settings → Environment Variables
2. Add:
   - Key: `NEXT_PUBLIC_API_URL`
   - Value: `https://api.clientefiel.riava.cl`
   - Environment: Production ✅, Preview ✅, Development ✅
3. Save

- [ ] **Step 3: Redeploy to apply the env var**

1. Vercel → project `clientefiel` → Deployments
2. Click the three dots on the latest deployment → **Redeploy**
3. Wait for deployment to complete

- [ ] **Step 4: Verify end-to-end**

Open `https://clientefiel.riava.cl` in the browser. Navigate to `/login` and try registering an account. The form should submit to `https://api.clientefiel.riava.cl` and return a real response (not a network error).

---

## Smoke Test Checklist

After all tasks complete, verify:

- [ ] `curl https://api.clientefiel.riava.cl/health` → `{"status":"ok","environment":"production"}`
- [ ] `systemctl status finops-api` → `active (running)`
- [ ] `systemctl status finops-celery` → `active (running)`
- [ ] `systemctl status finops-celery-beat` → `active (running)`
- [ ] `https://clientefiel.riava.cl` loads the landing page
- [ ] Registering a new account on `https://clientefiel.riava.cl/registro` works
- [ ] Push a trivial change to `backend/` → GitHub Actions deploys automatically

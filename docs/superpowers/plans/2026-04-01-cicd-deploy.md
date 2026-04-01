# CI/CD + Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Configure GitHub Actions CI pipeline and deploy backend to Railway and frontend to Vercel for the Cliente Fiel MVP.

**Architecture:** GitHub Actions runs lint + tests on every push/PR; merges to `main` trigger automatic deploy to Vercel (frontend) and Railway (backend). Backend runs in Docker with PostgreSQL and Redis as Railway managed services. Alembic migrations run automatically on each backend deploy.

**Tech Stack:** GitHub Actions, Railway (FastAPI + PostgreSQL 16 + Redis 7), Vercel (Next.js 14), Docker, Alembic

---

## File Map

| File | Action | Purpose |
|------|--------|---------|
| `.github/workflows/ci.yml` | Create | Lint + test on every push/PR |
| `.github/workflows/deploy-backend.yml` | Create | Deploy backend to Railway on push to main |
| `.github/workflows/deploy-frontend.yml` | Create | Deploy frontend to Vercel on push to main |
| `backend/Dockerfile` | Modify | Add migration step + healthcheck |
| `backend/docker-compose.yml` | Modify | Add celery worker + beat services |
| `backend/scripts/start.sh` | Create | Entrypoint: run migrations then start uvicorn |
| `backend/.env.example` | Create | Template for all required env vars |
| `frontend/.env.example` | Create | Template for all required frontend env vars |
| `.gitignore` | Modify | Ensure .env files are ignored |

---

## Task 1: Backend entrypoint script + Dockerfile update

**Files:**
- Create: `backend/scripts/start.sh`
- Modify: `backend/Dockerfile`

- [ ] **Step 1: Create the entrypoint script**

Create `backend/scripts/start.sh`:

```bash
#!/bin/bash
set -e

echo "Running Alembic migrations..."
alembic upgrade head

echo "Starting uvicorn..."
exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
```

- [ ] **Step 2: Update Dockerfile to use the entrypoint script and add healthcheck**

Replace `backend/Dockerfile` with:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN chmod +x scripts/start.sh

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8000}/health || exit 1

CMD ["./scripts/start.sh"]
```

- [ ] **Step 3: Add health endpoint to FastAPI**

In `backend/app/main.py`, add after the existing imports and before the middleware setup:

```python
@app.get("/health")
async def health_check():
    return {"status": "ok"}
```

- [ ] **Step 4: Verify Dockerfile builds locally**

```bash
cd backend
docker build -t clientefiel-backend:test .
```

Expected: `Successfully built <image_id>`

- [ ] **Step 5: Commit**

```bash
git add backend/Dockerfile backend/scripts/start.sh backend/app/main.py
git commit -m "feat: add entrypoint script with migrations and health check endpoint"
```

---

## Task 2: docker-compose update with Celery services

**Files:**
- Modify: `backend/docker-compose.yml`

- [ ] **Step 1: Update docker-compose.yml to add celery worker and beat**

Replace `backend/docker-compose.yml` with:

```yaml
version: "3.9"

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: clientefiel
      POSTGRES_PASSWORD: password
      POSTGRES_DB: clientefiel_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U clientefiel"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5

  api:
    build: .
    ports:
      - "8000:8000"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  worker:
    build: .
    command: celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy

  beat:
    build: .
    command: celery -A app.tasks.celery_app beat --loglevel=info
    env_file: .env
    depends_on:
      - redis

volumes:
  postgres_data:
```

- [ ] **Step 2: Commit**

```bash
git add backend/docker-compose.yml
git commit -m "feat: add celery worker and beat services to docker-compose"
```

---

## Task 3: Environment variable templates

**Files:**
- Create: `backend/.env.example`
- Create: `frontend/.env.example`
- Modify: `.gitignore`

- [ ] **Step 1: Create backend/.env.example**

```bash
# Application
ENVIRONMENT=production
PORT=8000

# Database (Railway provides DATABASE_URL automatically)
DATABASE_URL=postgresql+asyncpg://user:password@host:5432/dbname

# Redis (Railway provides REDIS_URL automatically)
REDIS_URL=redis://localhost:6379/0

# JWT
JWT_SECRET=your-very-long-random-secret-min-32-chars
JWT_ALGORITHM=HS256

# Frontend
FRONTEND_URL=https://your-app.vercel.app

# Meta / WhatsApp
META_APP_ID=your-meta-app-id
META_APP_SECRET=your-meta-app-secret
META_WEBHOOK_VERIFY_TOKEN=your-random-verify-token

# Encryption (Fernet key — generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())")
ENCRYPTION_KEY=your-fernet-key

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_MEDIUM_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...

# Celery
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

- [ ] **Step 2: Create frontend/.env.example**

```bash
# Backend API URL
NEXT_PUBLIC_API_URL=https://your-backend.railway.app

# Meta / WhatsApp Embedded Signup
NEXT_PUBLIC_META_APP_ID=your-meta-app-id
NEXT_PUBLIC_META_SIGNUP_CONFIG_ID=your-signup-config-id

# Site URL (used for SEO canonical URLs)
NEXT_PUBLIC_SITE_URL=https://your-app.vercel.app

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

- [ ] **Step 3: Verify .gitignore covers all .env files**

Check root `.gitignore` contains:
```
.env
.env.local
.env.*.local
backend/.env
frontend/.env.local
```

If the root `.gitignore` does not exist, create it with:
```
# Environment files
.env
.env.local
.env.*.local
backend/.env
frontend/.env.local

# Python
__pycache__/
*.py[cod]
venv/
.venv/
*.egg-info/

# Node
node_modules/
.next/
frontend/.next/

# macOS
.DS_Store

# IDE
.vscode/
.idea/

# Claude
.claude/
```

- [ ] **Step 4: Commit**

```bash
git add backend/.env.example frontend/.env.example .gitignore
git commit -m "chore: add env var templates and update .gitignore"
```

---

## Task 4: GitHub Actions — CI pipeline

**Files:**
- Create: `.github/workflows/ci.yml`

- [ ] **Step 1: Create .github/workflows directory and ci.yml**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main, staging]
  pull_request:
    branches: [main, staging]

jobs:
  backend-test:
    name: Backend — lint + test
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: clientefiel
          POSTGRES_PASSWORD: testpassword
          POSTGRES_DB: clientefiel_test
        ports:
          - 5432:5432
        options: >-
          --health-cmd pg_isready
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 5s
          --health-timeout 5s
          --health-retries 5

    defaults:
      run:
        working-directory: backend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Python 3.12
        uses: actions/setup-python@v5
        with:
          python-version: "3.12"
          cache: pip
          cache-dependency-path: backend/requirements.txt

      - name: Install dependencies
        run: pip install -r requirements.txt

      - name: Run tests
        env:
          ENVIRONMENT: test
          DATABASE_URL: postgresql+asyncpg://clientefiel:testpassword@localhost:5432/clientefiel_test
          REDIS_URL: redis://localhost:6379/0
          JWT_SECRET: test-secret-key-min-32-characters-long
          JWT_ALGORITHM: HS256
          FRONTEND_URL: http://localhost:3000
          META_APP_ID: test-app-id
          META_APP_SECRET: test-app-secret
          META_WEBHOOK_VERIFY_TOKEN: test-verify-token
          ENCRYPTION_KEY: ${{ secrets.TEST_ENCRYPTION_KEY }}
          STRIPE_SECRET_KEY: sk_test_placeholder
          STRIPE_WEBHOOK_SECRET: whsec_test_placeholder
          STRIPE_BASIC_PRICE_ID: price_test_basic
          STRIPE_MEDIUM_PRICE_ID: price_test_medium
          STRIPE_PREMIUM_PRICE_ID: price_test_premium
          CELERY_BROKER_URL: redis://localhost:6379/0
          CELERY_RESULT_BACKEND: redis://localhost:6379/0
        run: |
          pytest --cov=app --cov-report=term-missing --cov-fail-under=70 -v

  frontend-build:
    name: Frontend — type check + build
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Type check
        run: npx tsc --noEmit

      - name: Build
        env:
          NEXT_PUBLIC_API_URL: https://placeholder.railway.app
          NEXT_PUBLIC_META_APP_ID: placeholder
          NEXT_PUBLIC_META_SIGNUP_CONFIG_ID: placeholder
          NEXT_PUBLIC_SITE_URL: https://placeholder.vercel.app
          NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: pk_test_placeholder
        run: npm run build
```

- [ ] **Step 2: Commit and push to trigger the first CI run**

```bash
git add .github/workflows/ci.yml
git commit -m "feat: add GitHub Actions CI pipeline for backend tests and frontend build"
git push origin main
```

- [ ] **Step 3: Verify CI runs green**

Go to `https://github.com/finopslatam-sudo/ClienteFiel/actions` and confirm both jobs pass.

**Note:** The `TEST_ENCRYPTION_KEY` secret must be set in GitHub. Generate one with:
```bash
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```
Then add it at: GitHub repo → Settings → Secrets and variables → Actions → New repository secret.

---

## Task 5: GitHub Actions — backend deploy to Railway

**Files:**
- Create: `.github/workflows/deploy-backend.yml`

- [ ] **Step 1: Create deploy-backend.yml**

Create `.github/workflows/deploy-backend.yml`:

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
    name: Deploy to Railway
    runs-on: ubuntu-latest
    needs: []

    steps:
      - uses: actions/checkout@v4

      - name: Install Railway CLI
        run: npm install -g @railway/cli

      - name: Deploy to Railway
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}
        run: |
          cd backend
          railway up --service clientefiel-api --detach
```

- [ ] **Step 2: Commit**

```bash
git add .github/workflows/deploy-backend.yml
git commit -m "feat: add GitHub Actions workflow for Railway backend deploy"
```

---

## Task 6: GitHub Actions — frontend deploy to Vercel

**Files:**
- Create: `.github/workflows/deploy-frontend.yml`

- [ ] **Step 1: Create deploy-frontend.yml**

Create `.github/workflows/deploy-frontend.yml`:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]
    paths:
      - "frontend/**"
      - ".github/workflows/deploy-frontend.yml"

jobs:
  deploy:
    name: Deploy to Vercel
    runs-on: ubuntu-latest

    defaults:
      run:
        working-directory: frontend

    steps:
      - uses: actions/checkout@v4

      - name: Set up Node.js 20
        uses: actions/setup-node@v4
        with:
          node-version: "20"
          cache: npm
          cache-dependency-path: frontend/package-lock.json

      - name: Install dependencies
        run: npm ci

      - name: Install Vercel CLI
        run: npm install -g vercel

      - name: Pull Vercel environment
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: vercel pull --yes --environment=production --token=$VERCEL_TOKEN

      - name: Build project
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: vercel build --prod --token=$VERCEL_TOKEN

      - name: Deploy to Vercel
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
          VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
          VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
        run: vercel deploy --prebuilt --prod --token=$VERCEL_TOKEN
```

- [ ] **Step 2: Commit and push all workflows**

```bash
git add .github/workflows/deploy-frontend.yml
git commit -m "feat: add GitHub Actions workflow for Vercel frontend deploy"
git push origin main
```

---

## Task 7: Railway setup (manual steps — documented)

> These steps are performed in the Railway dashboard, not via code. Document them here for reproducibility.

- [ ] **Step 1: Create Railway project**

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub repo
2. Select `finopslatam-sudo/ClienteFiel`
3. Set root directory to `backend`

- [ ] **Step 2: Add PostgreSQL service**

In Railway project → New Service → Database → PostgreSQL 16
Railway will inject `DATABASE_URL` automatically into all services in the same project.

- [ ] **Step 3: Add Redis service**

In Railway project → New Service → Database → Redis 7
Railway will inject `REDIS_URL` automatically.

- [ ] **Step 4: Set environment variables on the API service**

In Railway → clientefiel-api service → Variables, add each variable from `backend/.env.example`:

```
ENVIRONMENT=production
JWT_SECRET=<generate: python3 -c "import secrets; print(secrets.token_hex(32))">
JWT_ALGORITHM=HS256
FRONTEND_URL=https://<your-vercel-url>.vercel.app
META_APP_ID=<from Meta Developer Console>
META_APP_SECRET=<from Meta Developer Console>
META_WEBHOOK_VERIFY_TOKEN=<random string>
ENCRYPTION_KEY=<generate: python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())">
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_BASIC_PRICE_ID=price_...
STRIPE_MEDIUM_PRICE_ID=price_...
STRIPE_PREMIUM_PRICE_ID=price_...
CELERY_BROKER_URL=${{Redis.REDIS_URL}}
CELERY_RESULT_BACKEND=${{Redis.REDIS_URL}}
```

> `${{Redis.REDIS_URL}}` is Railway's reference syntax — it auto-fills the Redis URL.

- [ ] **Step 5: Add Celery Worker service**

In Railway → New Service → Empty Service → set:
- Source: same GitHub repo, root `backend`
- Start command: `celery -A app.tasks.celery_app worker --loglevel=info --concurrency=2`
- Copy same env vars from the API service

- [ ] **Step 6: Get the Railway token for GitHub Actions**

Railway dashboard → Account Settings → Tokens → New token → name it `github-actions`
Copy token → add to GitHub repo secrets as `RAILWAY_TOKEN`

- [ ] **Step 7: Verify deploy**

After first deploy, visit `https://<railway-url>/health` and confirm:
```json
{"status": "ok"}
```

---

## Task 8: Vercel setup (manual steps — documented)

> These steps are performed in the Vercel dashboard.

- [ ] **Step 1: Create Vercel project**

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. Select `finopslatam-sudo/ClienteFiel`
3. Set root directory to `frontend`
4. Framework preset: Next.js

- [ ] **Step 2: Set environment variables in Vercel**

Vercel dashboard → project → Settings → Environment Variables, add:

```
NEXT_PUBLIC_API_URL=https://<your-railway-url>.railway.app
NEXT_PUBLIC_META_APP_ID=<your-meta-app-id>
NEXT_PUBLIC_META_SIGNUP_CONFIG_ID=<your-signup-config-id>
NEXT_PUBLIC_SITE_URL=https://<your-vercel-url>.vercel.app
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

- [ ] **Step 3: Get Vercel tokens for GitHub Actions**

```bash
# Install Vercel CLI locally
npm i -g vercel

# Link project and get IDs
cd frontend
vercel link
# Follow prompts — this creates .vercel/project.json with orgId and projectId
cat .vercel/project.json
```

Add to GitHub secrets:
- `VERCEL_TOKEN` → Vercel dashboard → Settings → Tokens → Create
- `VERCEL_ORG_ID` → value of `orgId` from `.vercel/project.json`
- `VERCEL_PROJECT_ID` → value of `projectId` from `.vercel/project.json`

- [ ] **Step 4: Add .vercel to .gitignore**

In root `.gitignore`, ensure this line exists:
```
.vercel/
```

```bash
git add .gitignore
git commit -m "chore: add .vercel to gitignore"
git push origin main
```

- [ ] **Step 5: Verify deploy**

Visit the Vercel URL and confirm the landing page loads at `/`.

---

## Task 9: GitHub Secrets checklist + end-to-end smoke test

**Files:** None (verification only)

- [ ] **Step 1: Verify all required GitHub secrets are set**

Go to GitHub repo → Settings → Secrets and variables → Actions and confirm:

| Secret | Purpose |
|--------|---------|
| `TEST_ENCRYPTION_KEY` | Fernet key for CI tests |
| `RAILWAY_TOKEN` | Railway deploy token |
| `VERCEL_TOKEN` | Vercel deploy token |
| `VERCEL_ORG_ID` | Vercel org ID |
| `VERCEL_PROJECT_ID` | Vercel project ID |

- [ ] **Step 2: Push a small change to trigger full pipeline**

```bash
# Touch a file to trigger all workflows
echo "# CI/CD configured $(date)" >> docs/DEPLOY.md
git add docs/DEPLOY.md
git commit -m "chore: trigger full CI/CD pipeline smoke test"
git push origin main
```

- [ ] **Step 3: Verify all 3 workflows pass**

Go to `https://github.com/finopslatam-sudo/ClienteFiel/actions` and confirm:
- ✅ CI — both backend-test and frontend-build jobs green
- ✅ Deploy Backend — Railway deploy successful
- ✅ Deploy Frontend — Vercel deploy successful

- [ ] **Step 4: End-to-end smoke test**

```bash
# Test backend health
curl https://<your-railway-url>.railway.app/health
# Expected: {"status":"ok"}

# Test backend API docs (only in development, should be 404 in production)
curl -I https://<your-railway-url>.railway.app/docs
# Expected: HTTP/2 404

# Test frontend
curl -I https://<your-vercel-url>.vercel.app
# Expected: HTTP/2 200
```

- [ ] **Step 5: Final commit — update .env.example with actual service URLs**

```bash
# Update backend/.env.example with Railway URL comment
# Update frontend/.env.example with Vercel URL comment
git add backend/.env.example frontend/.env.example
git commit -m "chore: update env templates with production URL comments"
git push origin main
```

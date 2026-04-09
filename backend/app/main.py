# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.config import settings
from app.core.rate_limit import limiter
from app.api import auth
from app.api import whatsapp as whatsapp_router
from app.api import services_router
from app.api import bookings as bookings_router
from app.api import webhooks as webhooks_router
from app.api import dashboard as dashboard_router
from app.api import logs as logs_router
from app.api import availability as availability_router
from app.api import public as public_router
from app.api import tenant as tenant_router
from app.api import customers as customers_router
from app.api import billing as billing_router
from app.api import account as account_router

app = FastAPI(
    title="Cliente Fiel API",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.frontend_url],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router, prefix="/api/v1")
app.include_router(whatsapp_router.router, prefix="/api/v1")
app.include_router(services_router.router, prefix="/api/v1")
app.include_router(bookings_router.router, prefix="/api/v1")
app.include_router(dashboard_router.router, prefix="/api/v1")
app.include_router(logs_router.router, prefix="/api/v1")
app.include_router(webhooks_router.router, prefix="/api")
app.include_router(availability_router.router, prefix="/api/v1")
app.include_router(public_router.router, prefix="/api/v1")
app.include_router(tenant_router.router, prefix="/api/v1")
app.include_router(customers_router.router, prefix="/api/v1")
app.include_router(billing_router.router, prefix="/api/v1")
app.include_router(account_router.router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}

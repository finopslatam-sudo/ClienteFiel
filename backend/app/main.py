# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.api import auth
from app.api import whatsapp as whatsapp_router
from app.api import services_router
from app.api import bookings as bookings_router

app = FastAPI(
    title="Cliente Fiel API",
    version="1.0.0",
    docs_url="/docs" if settings.environment == "development" else None,
    redoc_url=None,
)

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


@app.get("/health")
async def health():
    return {"status": "ok", "environment": settings.environment}

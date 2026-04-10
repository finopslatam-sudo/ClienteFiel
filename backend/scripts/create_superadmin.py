#!/usr/bin/env python
"""
Crea un superadmin. Uso:
  python scripts/create_superadmin.py admin@example.com MyPassword123
"""
import asyncio
import sys
import uuid
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.core.security import hash_password
from app.models.superadmin import SuperAdminUser


async def main(email: str, password: str) -> None:
    engine = create_async_engine(
        settings.database_url.replace("postgresql://", "postgresql+asyncpg://")
    )
    async_session = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with async_session() as db:
        admin = SuperAdminUser(
            id=uuid.uuid4(),
            email=email,
            password_hash=hash_password(password),
            is_active=True,
        )
        db.add(admin)
        await db.commit()
        print(f"SuperAdmin creado: {email}")
    await engine.dispose()


if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python scripts/create_superadmin.py <email> <password>")
        sys.exit(1)
    asyncio.run(main(sys.argv[1], sys.argv[2]))

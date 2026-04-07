"""add customer to bookingcreatedby enum and description to services

Revision ID: c3e1a2d4f5b6
Revises: 4a70b601eee7
Create Date: 2026-04-07 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'c3e1a2d4f5b6'
down_revision: Union[str, None] = '4a70b601eee7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TYPE bookingcreatedby ADD VALUE IF NOT EXISTS 'customer'")
    op.add_column('services', sa.Column('description', sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column('services', 'description')
    # PostgreSQL does not support removing enum values; skipped

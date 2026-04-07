"""add timezone to tenants

Revision ID: d4f2b1e3a7c8
Revises: c3e1a2d4f5b6
Create Date: 2026-04-07 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'd4f2b1e3a7c8'
down_revision: Union[str, None] = 'c3e1a2d4f5b6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('tenants', sa.Column('timezone', sa.String(length=60), nullable=False, server_default='America/Santiago'))


def downgrade() -> None:
    op.drop_column('tenants', 'timezone')

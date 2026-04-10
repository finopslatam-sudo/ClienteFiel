"""add_superadmin_users

Revision ID: a1b2c3d4e5f6
Revises: b3c7e9d1f2a4
Create Date: 2026-04-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'a1b2c3d4e5f6'
down_revision = 'b3c7e9d1f2a4'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'superadmin_users',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('email', sa.String(255), nullable=False, unique=True),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
    )
    op.create_index('ix_superadmin_users_email', 'superadmin_users', ['email'])


def downgrade() -> None:
    op.drop_index('ix_superadmin_users_email', 'superadmin_users')
    op.drop_table('superadmin_users')

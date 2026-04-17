"""add time_unit to custom_reminders

Revision ID: g2b3c4d5e6f7
Revises: f1a2b3c4d5e6
Create Date: 2026-04-17

"""
from alembic import op
import sqlalchemy as sa

revision = 'g2b3c4d5e6f7'
down_revision = 'f1a2b3c4d5e6'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'custom_reminders',
        sa.Column('time_unit', sa.Text(), nullable=False, server_default='days')
    )


def downgrade() -> None:
    op.drop_column('custom_reminders', 'time_unit')

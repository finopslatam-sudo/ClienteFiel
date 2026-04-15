# backend/alembic/versions/f1a2b3c4d5e6_add_automations_tables.py
"""add automations tables

Revision ID: f1a2b3c4d5e6
Revises: a1b2c3d4e5f6
Create Date: 2026-04-14

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision: str = 'f1a2b3c4d5e6'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tabla: custom_reminders
    op.create_table(
        'custom_reminders',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', UUID(as_uuid=True), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=True),
        sa.Column('message_text', sa.Text(), nullable=False),
        sa.Column('days_before', sa.Integer(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_custom_reminders_tenant_id', 'custom_reminders', ['tenant_id'])

    # Tabla: automation_settings (1 fila por tenant, UNIQUE)
    op.create_table(
        'automation_settings',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('repurchase_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('repurchase_days_after', sa.Integer(), nullable=False, server_default='30'),
        sa.Column('repurchase_message', sa.Text(), nullable=True),
        sa.Column('points_enabled', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('points_per_visit', sa.Integer(), nullable=False, server_default='10'),
        sa.Column('points_redeem_threshold', sa.Integer(), nullable=False, server_default='100'),
        sa.Column('points_reward_description', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    # Tipo enum para campaign trigger (CREATE IF NOT EXISTS via DO block — compatible con asyncpg)
    op.execute(
        "DO $$ BEGIN "
        "IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'campaigntriggertype') THEN "
        "CREATE TYPE campaigntriggertype AS ENUM ('inactive_days'); "
        "END IF; "
        "END $$"
    )

    # Tabla: campaigns
    op.create_table(
        'campaigns',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('tenant_id', UUID(as_uuid=True), sa.ForeignKey('tenants.id', ondelete='CASCADE'), nullable=False),
        sa.Column('name', sa.String(100), nullable=False),
        sa.Column('message_text', sa.Text(), nullable=False),
        sa.Column('trigger_type', sa.Enum('inactive_days', name='campaigntriggertype'), nullable=False),
        sa.Column('trigger_value', sa.Integer(), nullable=False),
        sa.Column('active', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('last_run_at', sa.DateTime(), nullable=True),
        sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.func.now(), nullable=False),
    )
    op.create_index('ix_campaigns_tenant_id', 'campaigns', ['tenant_id'])

    # Campo repurchase_sent_at en bookings
    op.add_column('bookings', sa.Column('repurchase_sent_at', sa.DateTime(), nullable=True))


def downgrade() -> None:
    op.drop_column('bookings', 'repurchase_sent_at')
    op.drop_index('ix_campaigns_tenant_id', table_name='campaigns')
    op.drop_table('campaigns')
    op.execute("DROP TYPE campaigntriggertype")
    op.drop_index('ix_custom_reminders_tenant_id', table_name='custom_reminders')
    op.drop_table('custom_reminders')

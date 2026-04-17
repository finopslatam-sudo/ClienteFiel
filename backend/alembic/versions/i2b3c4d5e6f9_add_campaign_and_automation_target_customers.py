"""add campaign_customers and automation_target_customers

Revision ID: i2b3c4d5e6f9
Revises: h2b3c4d5e6f8
Create Date: 2026-04-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'i2b3c4d5e6f9'
down_revision = 'h2b3c4d5e6f8'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'campaign_customers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('campaign_id', UUID(as_uuid=True),
                  sa.ForeignKey('campaigns.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('customer_id', UUID(as_uuid=True),
                  sa.ForeignKey('customers.id', ondelete='CASCADE'),
                  nullable=False),
        sa.UniqueConstraint('campaign_id', 'customer_id', name='uq_campaign_customer'),
    )
    op.create_table(
        'automation_target_customers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('settings_id', UUID(as_uuid=True),
                  sa.ForeignKey('automation_settings.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('customer_id', UUID(as_uuid=True),
                  sa.ForeignKey('customers.id', ondelete='CASCADE'),
                  nullable=False),
        sa.Column('context', sa.Text(), nullable=False),
        sa.UniqueConstraint('settings_id', 'customer_id', 'context',
                            name='uq_automation_target_customer'),
    )


def downgrade() -> None:
    op.drop_table('automation_target_customers')
    op.drop_table('campaign_customers')

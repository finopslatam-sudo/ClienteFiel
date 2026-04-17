"""add send_time and custom_reminder_customers

Revision ID: h2b3c4d5e6f8
Revises: g2b3c4d5e6f7
Create Date: 2026-04-17

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID

revision = 'h2b3c4d5e6f8'
down_revision = 'g2b3c4d5e6f7'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'custom_reminders',
        sa.Column('send_time', sa.Text(), nullable=False, server_default='09:00')
    )
    op.create_table(
        'custom_reminder_customers',
        sa.Column('id', UUID(as_uuid=True), primary_key=True),
        sa.Column('reminder_id', UUID(as_uuid=True),
                  sa.ForeignKey('custom_reminders.id', ondelete='CASCADE'),
                  nullable=False, index=True),
        sa.Column('customer_id', UUID(as_uuid=True),
                  sa.ForeignKey('customers.id', ondelete='CASCADE'),
                  nullable=False),
        sa.UniqueConstraint('reminder_id', 'customer_id', name='uq_reminder_customer'),
    )


def downgrade() -> None:
    op.drop_table('custom_reminder_customers')
    op.drop_column('custom_reminders', 'send_time')

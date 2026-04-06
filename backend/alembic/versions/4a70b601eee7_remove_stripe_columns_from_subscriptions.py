"""remove_stripe_columns_from_subscriptions

Revision ID: 4a70b601eee7
Revises: f868c3e101d5
Create Date: 2026-04-06 16:01:36.604971

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '4a70b601eee7'
down_revision: Union[str, None] = 'f868c3e101d5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column('subscriptions', 'stripe_customer_id')
    op.drop_column('subscriptions', 'stripe_subscription_id')


def downgrade() -> None:
    op.add_column('subscriptions', sa.Column('stripe_subscription_id', sa.String(length=100), nullable=True))
    op.add_column('subscriptions', sa.Column('stripe_customer_id', sa.String(length=100), nullable=True))

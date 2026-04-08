"""add payment provider fields to subscriptions

Revision ID: e5a3c2b1d9f7
Revises: d4f2b1e3a7c8
Create Date: 2026-04-08 00:00:00.000000

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = 'e5a3c2b1d9f7'
down_revision: Union[str, None] = 'd4f2b1e3a7c8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("CREATE TYPE paymentprovider AS ENUM ('mercadopago', 'paypal', 'webpay', 'none')")
    op.add_column('subscriptions', sa.Column(
        'provider',
        sa.Enum('mercadopago', 'paypal', 'webpay', 'none', name='paymentprovider'),
        nullable=False,
        server_default='none',
    ))
    op.add_column('subscriptions', sa.Column('external_subscription_id', sa.String(255), nullable=True))
    op.add_column('subscriptions', sa.Column('external_payer_id', sa.String(255), nullable=True))


def downgrade() -> None:
    op.drop_column('subscriptions', 'external_payer_id')
    op.drop_column('subscriptions', 'external_subscription_id')
    op.drop_column('subscriptions', 'provider')
    op.execute("DROP TYPE paymentprovider")

"""add_billing_profile_address

Revision ID: b3c7e9d1f2a4
Revises: 5b5fb781633a
Create Date: 2026-04-09

- Adds company_address column to billing_profiles
- Updates CheckConstraint: replaces company_name requirement with company_address
"""
from alembic import op
import sqlalchemy as sa

revision = 'b3c7e9d1f2a4'
down_revision = '5b5fb781633a'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        'billing_profiles',
        sa.Column('company_address', sa.String(500), nullable=True)
    )
    op.drop_constraint('ck_billing_profile_factura_fields', 'billing_profiles')
    op.create_check_constraint(
        'ck_billing_profile_factura_fields',
        'billing_profiles',
        "(document_type = 'boleta') OR "
        "(company_razon_social IS NOT NULL AND company_rut IS NOT NULL "
        "AND company_giro IS NOT NULL AND company_address IS NOT NULL)"
    )


def downgrade() -> None:
    op.drop_constraint('ck_billing_profile_factura_fields', 'billing_profiles')
    op.create_check_constraint(
        'ck_billing_profile_factura_fields',
        'billing_profiles',
        "(document_type = 'boleta') OR "
        "(company_name IS NOT NULL AND company_razon_social IS NOT NULL "
        "AND company_rut IS NOT NULL AND company_giro IS NOT NULL)"
    )
    op.drop_column('billing_profiles', 'company_address')
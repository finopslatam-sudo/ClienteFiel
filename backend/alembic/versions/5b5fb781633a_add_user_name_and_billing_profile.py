"""add_user_name_and_billing_profile

Revision ID: 5b5fb781633a
Revises: e5a3c2b1d9f7
Create Date: 2026-04-09 10:06:07.030173

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = '5b5fb781633a'
down_revision: Union[str, None] = 'e5a3c2b1d9f7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add name columns to users
    op.add_column("users", sa.Column("first_name", sa.String(100), nullable=True))
    op.add_column("users", sa.Column("last_name", sa.String(100), nullable=True))

    # Create billing_profiles table
    op.create_table(
        "billing_profiles",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column("tenant_id", postgresql.UUID(as_uuid=True),
                  sa.ForeignKey("tenants.id", ondelete="CASCADE"),
                  unique=True, nullable=False),
        sa.Column("document_type", sa.Enum("boleta", "factura", name="documenttype"), nullable=False),
        sa.Column("person_first_name", sa.String(100), nullable=False),
        sa.Column("person_last_name", sa.String(100), nullable=False),
        sa.Column("person_rut", sa.String(20), nullable=False),
        sa.Column("person_email", sa.String(255), nullable=False),
        sa.Column("company_name", sa.String(255), nullable=True),
        sa.Column("company_razon_social", sa.String(255), nullable=True),
        sa.Column("company_rut", sa.String(20), nullable=True),
        sa.Column("company_giro", sa.String(255), nullable=True),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint(
            "(document_type = 'boleta') OR "
            "(company_name IS NOT NULL AND company_razon_social IS NOT NULL "
            "AND company_rut IS NOT NULL AND company_giro IS NOT NULL)",
            name="ck_billing_profile_factura_fields"
        ),
    )
    op.create_index("ix_billing_profiles_tenant_id", "billing_profiles", ["tenant_id"])


def downgrade() -> None:
    op.drop_index("ix_billing_profiles_tenant_id", table_name="billing_profiles")
    op.drop_table("billing_profiles")
    op.execute("DROP TYPE IF EXISTS documenttype")
    op.drop_column("users", "last_name")
    op.drop_column("users", "first_name")

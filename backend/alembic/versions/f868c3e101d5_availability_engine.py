"""availability_engine

Revision ID: f868c3e101d5
Revises: 90d34ba2e8aa
Create Date: 2026-04-06 14:41:45.797243

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f868c3e101d5'
down_revision: Union[str, None] = '90d34ba2e8aa'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old unused time_slots table
    op.drop_table("time_slots")

    # Create availability_rules
    op.create_table(
        "availability_rules",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("slot_duration_minutes", sa.Integer(), nullable=False, server_default="30"),
        sa.Column("buffer_minutes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("max_bookings_per_day", sa.Integer(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("timezone", sa.String(50), nullable=False, server_default="America/Santiago"),
        sa.Column("created_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "day_of_week", name="uq_availability_tenant_day"),
    )
    op.create_index("ix_availability_rules_tenant_id", "availability_rules", ["tenant_id"])

    # Create availability_overrides
    op.create_table(
        "availability_overrides",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("override_date", sa.Date(), nullable=False),
        sa.Column("is_closed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("custom_start_time", sa.Time(), nullable=True),
        sa.Column("custom_end_time", sa.Time(), nullable=True),
        sa.Column("reason", sa.String(255), nullable=True),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("tenant_id", "override_date", name="uq_override_tenant_date"),
    )
    op.create_index("ix_availability_overrides_tenant_id", "availability_overrides", ["tenant_id"])
    op.create_index("ix_availability_overrides_date", "availability_overrides", ["override_date"])

    # Add ends_at to bookings
    op.add_column("bookings", sa.Column("ends_at", sa.DateTime(), nullable=True))
    op.create_index("ix_bookings_ends_at", "bookings", ["ends_at"])


def downgrade() -> None:
    op.drop_index("ix_bookings_ends_at", table_name="bookings")
    op.drop_column("bookings", "ends_at")
    op.drop_index("ix_availability_overrides_date", table_name="availability_overrides")
    op.drop_index("ix_availability_overrides_tenant_id", table_name="availability_overrides")
    op.drop_table("availability_overrides")
    op.drop_index("ix_availability_rules_tenant_id", table_name="availability_rules")
    op.drop_table("availability_rules")
    op.create_table(
        "time_slots",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("tenant_id", sa.UUID(), nullable=False),
        sa.Column("day_of_week", sa.Integer(), nullable=False),
        sa.Column("start_time", sa.Time(), nullable=False),
        sa.Column("end_time", sa.Time(), nullable=False),
        sa.Column("max_concurrent", sa.Integer(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.ForeignKeyConstraint(["tenant_id"], ["tenants.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

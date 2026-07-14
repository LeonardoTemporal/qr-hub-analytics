"""Add P0 warranty care and showcase consent fields.

Revision ID: 20260713_warranty_compliance
Revises: 20260713_security_analytics
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260713_warranty_compliance"
down_revision: str | None = "20260713_security_analytics"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE warranty_policies
            ADD COLUMN IF NOT EXISTS workmanship_warranty_years INTEGER,
            ADD COLUMN IF NOT EXISTS workmanship_warranty_expires_at DATE,
            ADD COLUMN IF NOT EXISTS drying_method VARCHAR(40),
            ADD COLUMN IF NOT EXISTS water_temperature VARCHAR(40),
            ADD COLUMN IF NOT EXISTS first_wash_after_days INTEGER,
            ADD COLUMN IF NOT EXISTS curing_period_hours INTEGER,
            ADD COLUMN IF NOT EXISTS no_water_hours INTEGER,
            ADD COLUMN IF NOT EXISTS no_detergent_days INTEGER,
            ADD COLUMN IF NOT EXISTS maintenance_inspection_frequency_months INTEGER,
            ADD COLUMN IF NOT EXISTS maintenance_inspection_frequency_days INTEGER,
            ADD COLUMN IF NOT EXISTS covered_areas JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS covered_surfaces JSONB DEFAULT '{}'::jsonb,
            ADD COLUMN IF NOT EXISTS annual_inspection_required BOOLEAN NOT NULL DEFAULT FALSE,
            ADD COLUMN IF NOT EXISTS warranty_card_number VARCHAR(80)
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'ck_warranty_profeco_minimum'
            ) THEN
                ALTER TABLE warranty_policies
                    ADD CONSTRAINT ck_warranty_profeco_minimum
                    CHECK (expiration_date >= effective_date + 60);
            END IF;
        END
        $$
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_warranty_policies_covered_areas "
        "ON warranty_policies USING GIN (covered_areas)"
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_warranty_policies_warranty_card_number "
        "ON warranty_policies (warranty_card_number)"
    )
    op.execute(
        """
        ALTER TABLE showcase_social_proof
            ADD COLUMN IF NOT EXISTS client_approved_at TIMESTAMPTZ,
            ADD COLUMN IF NOT EXISTS client_approved_ip VARCHAR(45),
            ALTER COLUMN show_testimonial SET DEFAULT FALSE,
            ALTER COLUMN show_story SET DEFAULT FALSE,
            ALTER COLUMN show_photographer SET DEFAULT FALSE
        """
    )


def downgrade() -> None:
    op.drop_column("showcase_social_proof", "client_approved_ip")
    op.drop_column("showcase_social_proof", "client_approved_at")
    op.drop_index("ix_warranty_policies_warranty_card_number", table_name="warranty_policies")
    op.drop_index("ix_warranty_policies_covered_areas", table_name="warranty_policies")
    op.drop_constraint("ck_warranty_profeco_minimum", "warranty_policies", type_="check")
    for column_name in (
        "warranty_card_number",
        "annual_inspection_required",
        "covered_surfaces",
        "covered_areas",
        "maintenance_inspection_frequency_days",
        "maintenance_inspection_frequency_months",
        "no_detergent_days",
        "no_water_hours",
        "curing_period_hours",
        "first_wash_after_days",
        "water_temperature",
        "drying_method",
        "workmanship_warranty_expires_at",
        "workmanship_warranty_years",
    ):
        op.drop_column("warranty_policies", column_name)

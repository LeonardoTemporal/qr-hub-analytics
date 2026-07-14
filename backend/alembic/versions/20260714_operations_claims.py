"""Complete operational editing, warranty claims, and private media support.

Revision ID: 20260714_operations_claims
Revises: 20260713_warranty_compliance
"""

from collections.abc import Sequence

from alembic import op

revision: str = "20260714_operations_claims"
down_revision: str | None = "20260713_warranty_compliance"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS warranty_claims (
            id BIGSERIAL PRIMARY KEY,
            claim_number VARCHAR(64) NOT NULL UNIQUE,
            warranty_policy_id BIGINT NOT NULL
                REFERENCES warranty_policies(id) ON DELETE CASCADE,
            vehicle_id BIGINT NOT NULL
                REFERENCES vehicles(id) ON DELETE CASCADE,
            status VARCHAR(24) NOT NULL DEFAULT 'submitted',
            description TEXT NOT NULL,
            incident_at DATE,
            resolution_notes TEXT,
            resolved_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_warranty_claims_status CHECK (
                status IN (
                    'submitted', 'under_review', 'approved',
                    'rejected', 'resolved', 'cancelled'
                )
            )
        )
        """
    )
    op.execute(
        "CREATE INDEX IF NOT EXISTS ix_warranty_claims_vehicle_status "
        "ON warranty_claims (vehicle_id, status)"
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS warranty_claim_media (
            id BIGSERIAL PRIMARY KEY,
            warranty_claim_id BIGINT NOT NULL
                REFERENCES warranty_claims(id) ON DELETE CASCADE,
            media_asset_id BIGINT NOT NULL
                REFERENCES media_assets(id) ON DELETE CASCADE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_warranty_claim_media_asset
                UNIQUE (warranty_claim_id, media_asset_id)
        )
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_work_order_items_service_type'
            ) THEN
                ALTER TABLE work_order_items
                    ADD CONSTRAINT ck_work_order_items_service_type
                    CHECK (service_type IN ('PPF', 'Wrap', 'Ceramic', 'Detailing', 'Maintenance'));
            END IF;
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_work_order_items_status'
            ) THEN
                ALTER TABLE work_order_items
                    ADD CONSTRAINT ck_work_order_items_status
                    CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'));
            END IF;
        END
        $$
        """
    )


def downgrade() -> None:
    op.execute(
        "ALTER TABLE work_order_items "
        "DROP CONSTRAINT IF EXISTS ck_work_order_items_status"
    )
    op.execute(
        "ALTER TABLE work_order_items "
        "DROP CONSTRAINT IF EXISTS ck_work_order_items_service_type"
    )
    op.drop_table("warranty_claim_media")
    op.drop_index("ix_warranty_claims_vehicle_status", table_name="warranty_claims")
    op.drop_table("warranty_claims")

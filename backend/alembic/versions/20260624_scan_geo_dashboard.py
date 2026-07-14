"""scan geo dashboard

Revision ID: 20260624_scan_geo
Revises:
Create Date: 2026-06-24
"""

from __future__ import annotations

from alembic import op

revision = "20260624_scan_geo"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Baseline the legacy schema for clean installations. Existing databases
    # are left untouched by IF NOT EXISTS and continue through additive alters.
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS scans (
            id SERIAL PRIMARY KEY,
            campaign_id VARCHAR(100) NOT NULL,
            scan_token VARCHAR(120) UNIQUE,
            country VARCHAR(100),
            state VARCHAR(100),
            city VARCHAR(100),
            device_type VARCHAR(50),
            os VARCHAR(100),
            browser VARCHAR(100),
            scanned_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS clients (
            id BIGSERIAL PRIMARY KEY,
            full_name TEXT NOT NULL,
            phone VARCHAR(32),
            email VARCHAR(255),
            preferred_contact_channel VARCHAR(32),
            notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vehicles (
            id BIGSERIAL PRIMARY KEY,
            client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
            brand VARCHAR(80) NOT NULL,
            model VARCHAR(120) NOT NULL,
            year INTEGER,
            vin VARCHAR(64) UNIQUE,
            plate VARCHAR(32),
            color VARCHAR(80),
            access_pin_hash VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_vehicles_access_pin_hash UNIQUE(access_pin_hash)
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS vehicle_qr_codes (
            id BIGSERIAL PRIMARY KEY,
            vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            qr_id VARCHAR(120) NOT NULL UNIQUE,
            public_slug VARCHAR(160) NOT NULL UNIQUE,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            activated_at TIMESTAMPTZ,
            revoked_at TIMESTAMPTZ,
            last_scanned_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS service_records (
            id BIGSERIAL PRIMARY KEY,
            vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            service_type VARCHAR(40) NOT NULL,
            title VARCHAR(160),
            installed_at DATE NOT NULL,
            warranty_expires_at DATE,
            washing_recommendations TEXT,
            care_instructions TEXT,
            internal_notes TEXT,
            is_public BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_service_records_service_type CHECK (
                service_type IN ('PPF','Wrap','Ceramic','Detailing','Maintenance')
            )
        )
        """
    )
    op.execute(
        """
        CREATE TABLE IF NOT EXISTS service_media (
            id BIGSERIAL PRIMARY KEY,
            service_record_id BIGINT NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
            media_url TEXT NOT NULL,
            media_type VARCHAR(24) NOT NULL DEFAULT 'image',
            caption TEXT,
            sort_order INTEGER NOT NULL DEFAULT 0,
            is_public BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_service_media_media_type CHECK (
                media_type IN ('image','video','document')
            )
        )
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_scans_campaign_id ON scans(campaign_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scans_scan_token ON scans(scan_token)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_phone ON clients(phone)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_clients_email ON clients(email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_service_records_service_type ON service_records(service_type)")
    op.execute(
        """
        ALTER TABLE scans
            ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS accuracy_meters INTEGER,
            ADD COLUMN IF NOT EXISTS geo_source VARCHAR(40),
            ADD COLUMN IF NOT EXISTS geo_hash_5 VARCHAR(5),
            ADD COLUMN IF NOT EXISTS geo_hash_7 VARCHAR(7);
        """
    )
    op.execute(
        """
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_scans_geo_source'
            ) THEN
                ALTER TABLE scans
                ADD CONSTRAINT ck_scans_geo_source
                CHECK (geo_source IN ('ip', 'browser', 'gps'));
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_scans_accuracy_positive'
            ) THEN
                ALTER TABLE scans
                ADD CONSTRAINT ck_scans_accuracy_positive
                CHECK (accuracy_meters > 0);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_scans_latitude_range'
            ) THEN
                ALTER TABLE scans
                ADD CONSTRAINT ck_scans_latitude_range
                CHECK (latitude BETWEEN -90 AND 90);
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM pg_constraint
                WHERE conname = 'ck_scans_longitude_range'
            ) THEN
                ALTER TABLE scans
                ADD CONSTRAINT ck_scans_longitude_range
                CHECK (longitude BETWEEN -180 AND 180);
            END IF;
        END $$;
        """
    )
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_scans_lat_lng
        ON scans (latitude, longitude)
        WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
        """
    )
    op.execute("CREATE INDEX IF NOT EXISTS ix_scans_geo_hash_5 ON scans (geo_hash_5);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scans_geo_hash_7 ON scans (geo_hash_7);")
    op.execute("CREATE INDEX IF NOT EXISTS ix_scans_geo_source ON scans (geo_source);")
    op.execute(
        """
        CREATE INDEX IF NOT EXISTS ix_scans_scanned_at_brin
        ON scans USING BRIN (scanned_at);
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS ix_scans_scanned_at_brin;")
    op.execute("DROP INDEX IF EXISTS ix_scans_geo_source;")
    op.execute("DROP INDEX IF EXISTS ix_scans_geo_hash_7;")
    op.execute("DROP INDEX IF EXISTS ix_scans_geo_hash_5;")
    op.execute("DROP INDEX IF EXISTS ix_scans_lat_lng;")
    op.execute("ALTER TABLE scans DROP CONSTRAINT IF EXISTS ck_scans_longitude_range;")
    op.execute("ALTER TABLE scans DROP CONSTRAINT IF EXISTS ck_scans_latitude_range;")
    op.execute("ALTER TABLE scans DROP CONSTRAINT IF EXISTS ck_scans_accuracy_positive;")
    op.execute("ALTER TABLE scans DROP CONSTRAINT IF EXISTS ck_scans_geo_source;")
    op.execute(
        """
        ALTER TABLE scans
            DROP COLUMN IF EXISTS geo_hash_7,
            DROP COLUMN IF EXISTS geo_hash_5,
            DROP COLUMN IF EXISTS accuracy_meters,
            DROP COLUMN IF EXISTS longitude,
            DROP COLUMN IF EXISTS latitude,
            DROP COLUMN IF EXISTS geo_source;
        """
    )

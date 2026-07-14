"""7Fitment modular platform foundation.

Revision ID: 20260713_evolution
Revises: 20260624_scan_geo
Create Date: 2026-07-13
"""

from __future__ import annotations

from alembic import op

revision = "20260713_evolution"
down_revision = "20260624_scan_geo"
branch_labels = None
depends_on = None


def _execute_batch(sql: str) -> None:
    """Execute a SQL script statement-by-statement for asyncpg compatibility."""
    statements: list[str] = []
    current: list[str] = []
    in_single_quote = False
    in_dollar_quote = False
    index = 0
    while index < len(sql):
        pair = sql[index : index + 2]
        char = sql[index]
        if pair == "$$" and not in_single_quote:
            in_dollar_quote = not in_dollar_quote
            current.append(pair)
            index += 2
            continue
        if char == "'" and not in_dollar_quote:
            if in_single_quote and index + 1 < len(sql) and sql[index + 1] == "'":
                current.append("''")
                index += 2
                continue
            in_single_quote = not in_single_quote
        if char == ";" and not in_single_quote and not in_dollar_quote:
            statement = "".join(current).strip()
            if statement:
                statements.append(statement)
            current = []
        else:
            current.append(char)
        index += 1
    trailing = "".join(current).strip()
    if trailing:
        statements.append(trailing)
    for statement in statements:
        op.execute(statement)


def upgrade() -> None:
    _execute_batch(
        """
        CREATE TABLE IF NOT EXISTS admin_users (
            id BIGSERIAL PRIMARY KEY,
            username VARCHAR(100) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            last_login_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS admin_sessions (
            id BIGSERIAL PRIMARY KEY,
            admin_user_id BIGINT NOT NULL REFERENCES admin_users(id) ON DELETE CASCADE,
            token_digest VARCHAR(64) NOT NULL UNIQUE,
            csrf_token VARCHAR(64) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            revoked_at TIMESTAMPTZ,
            last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE TABLE IF NOT EXISTS audit_log (
            id BIGSERIAL PRIMARY KEY,
            admin_user_id BIGINT REFERENCES admin_users(id) ON DELETE SET NULL,
            action VARCHAR(100) NOT NULL,
            entity_type VARCHAR(100) NOT NULL,
            entity_id VARCHAR(120),
            payload JSONB,
            ip_address VARCHAR(64),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_audit_log_action ON audit_log(action);

        CREATE TABLE IF NOT EXISTS service_catalog (
            id BIGSERIAL PRIMARY KEY,
            code VARCHAR(80) NOT NULL UNIQUE,
            name VARCHAR(160) NOT NULL,
            service_type VARCHAR(40) NOT NULL,
            description TEXT,
            default_warranty_months INTEGER,
            base_price_mxn NUMERIC(12,2),
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_service_catalog_service_type CHECK (
                service_type IN ('PPF','Wrap','Ceramic','Detailing','Maintenance')
            )
        );
        CREATE INDEX IF NOT EXISTS ix_service_catalog_service_type ON service_catalog(service_type);

        CREATE TABLE IF NOT EXISTS warranty_templates (
            id BIGSERIAL PRIMARY KEY,
            code VARCHAR(80) NOT NULL,
            version INTEGER NOT NULL,
            name VARCHAR(160) NOT NULL,
            service_type VARCHAR(40) NOT NULL,
            coverage JSONB NOT NULL DEFAULT '[]'::jsonb,
            exclusions JSONB NOT NULL DEFAULT '[]'::jsonb,
            care_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
            workmanship_warranty_years INTEGER,
            manufacturer_warranty_years INTEGER,
            is_active BOOLEAN NOT NULL DEFAULT TRUE,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT uq_warranty_template_version UNIQUE(code, version)
        );
        CREATE INDEX IF NOT EXISTS ix_warranty_templates_service_type ON warranty_templates(service_type);

        CREATE TABLE IF NOT EXISTS media_assets (
            id BIGSERIAL PRIMARY KEY,
            storage_key VARCHAR(255) NOT NULL UNIQUE,
            original_filename VARCHAR(255) NOT NULL,
            mime_type VARCHAR(120) NOT NULL,
            media_type VARCHAR(24) NOT NULL,
            byte_size BIGINT NOT NULL,
            checksum_sha256 VARCHAR(64) NOT NULL,
            visibility VARCHAR(16) NOT NULL DEFAULT 'private',
            processing_status VARCHAR(20) NOT NULL DEFAULT 'pending',
            public_path TEXT,
            width INTEGER,
            height INTEGER,
            duration_seconds NUMERIC(10,3),
            metadata JSONB,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_media_assets_visibility CHECK (visibility IN ('public','private')),
            CONSTRAINT ck_media_assets_processing_status CHECK (
                processing_status IN ('pending','processing','ready','failed')
            )
        );
        ALTER TABLE service_media
            ADD COLUMN IF NOT EXISTS media_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS ix_service_media_asset_id ON service_media(media_asset_id);

        CREATE TABLE IF NOT EXISTS workshop_profile (
            id BIGSERIAL PRIMARY KEY,
            name VARCHAR(160) NOT NULL DEFAULT '7Fitment',
            tagline VARCHAR(240),
            description TEXT,
            phone VARCHAR(32),
            email VARCHAR(255),
            address TEXT,
            city VARCHAR(100),
            state VARCHAR(100),
            country VARCHAR(100) NOT NULL DEFAULT 'Mexico',
            latitude DOUBLE PRECISION,
            longitude DOUBLE PRECISION,
            business_hours JSONB,
            service_areas JSONB,
            instagram_url TEXT,
            is_published BOOLEAN NOT NULL DEFAULT FALSE,
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );

        CREATE TABLE IF NOT EXISTS scan_sessions (
            id BIGSERIAL PRIMARY KEY,
            scan_id INTEGER NOT NULL UNIQUE REFERENCES scans(id) ON DELETE CASCADE,
            vehicle_qr_code_id BIGINT REFERENCES vehicle_qr_codes(id) ON DELETE SET NULL,
            attribution_token VARCHAR(120) NOT NULL UNIQUE,
            landing_path VARCHAR(255) NOT NULL,
            expires_at TIMESTAMPTZ NOT NULL,
            last_event_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_scan_sessions_attribution_token ON scan_sessions(attribution_token);
        CREATE INDEX IF NOT EXISTS ix_scan_sessions_created_at ON scan_sessions(created_at);

        CREATE TABLE IF NOT EXISTS work_orders (
            id BIGSERIAL PRIMARY KEY,
            order_number VARCHAR(40) NOT NULL UNIQUE,
            client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE RESTRICT,
            vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE RESTRICT,
            referral_scan_session_id BIGINT REFERENCES scan_sessions(id) ON DELETE SET NULL,
            status VARCHAR(32) NOT NULL DEFAULT 'draft',
            scheduled_for TIMESTAMPTZ,
            started_at TIMESTAMPTZ,
            completed_at TIMESTAMPTZ,
            delivered_at TIMESTAMPTZ,
            odometer_km INTEGER,
            intake_notes TEXT,
            quality_notes TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_work_orders_status CHECK (
                status IN ('draft','scheduled','in_progress','quality_check','ready','delivered','cancelled')
            )
        );
        CREATE INDEX IF NOT EXISTS ix_work_orders_vehicle_status ON work_orders(vehicle_id, status);

        CREATE TABLE IF NOT EXISTS work_order_items (
            id BIGSERIAL PRIMARY KEY,
            work_order_id BIGINT NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE,
            service_catalog_id BIGINT REFERENCES service_catalog(id) ON DELETE SET NULL,
            service_type VARCHAR(40) NOT NULL,
            title VARCHAR(160) NOT NULL,
            material_brand VARCHAR(120),
            material_product VARCHAR(160),
            finish_type VARCHAR(40),
            price_mxn NUMERIC(12,2),
            status VARCHAR(32) NOT NULL DEFAULT 'pending',
            notes TEXT
        );

        CREATE TABLE IF NOT EXISTS warranty_policies (
            id BIGSERIAL PRIMARY KEY,
            policy_number VARCHAR(64) NOT NULL UNIQUE,
            vehicle_id BIGINT NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
            service_record_id BIGINT NOT NULL REFERENCES service_records(id) ON DELETE CASCADE,
            template_id BIGINT REFERENCES warranty_templates(id) ON DELETE SET NULL,
            status VARCHAR(24) NOT NULL DEFAULT 'draft',
            effective_date DATE NOT NULL,
            expiration_date DATE NOT NULL,
            terms_version INTEGER NOT NULL,
            policy_snapshot JSONB NOT NULL,
            issued_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_warranty_policies_status CHECK (status IN ('draft','active','expired','revoked')),
            CONSTRAINT ck_warranty_dates CHECK (expiration_date >= effective_date)
        );
        CREATE INDEX IF NOT EXISTS ix_warranty_policies_vehicle_status ON warranty_policies(vehicle_id, status);

        CREATE TABLE IF NOT EXISTS showcase_profiles (
            id BIGSERIAL PRIMARY KEY,
            vehicle_id BIGINT NOT NULL UNIQUE REFERENCES vehicles(id) ON DELETE CASCADE,
            title VARCHAR(200),
            description TEXT,
            hero_media_asset_id BIGINT REFERENCES media_assets(id) ON DELETE SET NULL,
            status VARCHAR(24) NOT NULL DEFAULT 'draft',
            seo_title VARCHAR(180),
            seo_description VARCHAR(320),
            instagram_build_url TEXT,
            whatsapp_cta_url TEXT,
            book_consultation_url TEXT,
            published_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            CONSTRAINT ck_showcase_profiles_status CHECK (status IN ('draft','published','archived'))
        );
        CREATE TABLE IF NOT EXISTS showcase_social_proof (
            id BIGSERIAL PRIMARY KEY,
            showcase_profile_id BIGINT NOT NULL UNIQUE REFERENCES showcase_profiles(id) ON DELETE CASCADE,
            client_testimonial TEXT,
            vehicle_story TEXT,
            photographer_credit VARCHAR(160),
            show_testimonial BOOLEAN NOT NULL DEFAULT TRUE,
            show_story BOOLEAN NOT NULL DEFAULT TRUE,
            show_photographer BOOLEAN NOT NULL DEFAULT TRUE
        );

        CREATE TABLE IF NOT EXISTS analytics_events (
            id BIGSERIAL PRIMARY KEY,
            scan_session_id BIGINT NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
            event_type VARCHAR(64) NOT NULL,
            path VARCHAR(255),
            element_id VARCHAR(120),
            idempotency_key VARCHAR(120) UNIQUE,
            metadata JSONB,
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_analytics_events_event_type ON analytics_events(event_type);
        CREATE INDEX IF NOT EXISTS ix_analytics_events_session_time ON analytics_events(scan_session_id, occurred_at);

        CREATE TABLE IF NOT EXISTS conversions (
            id BIGSERIAL PRIMARY KEY,
            scan_session_id BIGINT NOT NULL REFERENCES scan_sessions(id) ON DELETE CASCADE,
            client_id BIGINT REFERENCES clients(id) ON DELETE SET NULL,
            vehicle_id BIGINT REFERENCES vehicles(id) ON DELETE SET NULL,
            work_order_id BIGINT REFERENCES work_orders(id) ON DELETE SET NULL,
            conversion_type VARCHAR(64) NOT NULL,
            value_mxn NUMERIC(12,2),
            occurred_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_conversions_type_time ON conversions(conversion_type, occurred_at);

        CREATE TABLE IF NOT EXISTS event_outbox (
            id BIGSERIAL PRIMARY KEY,
            topic VARCHAR(120) NOT NULL,
            payload JSONB NOT NULL,
            status VARCHAR(24) NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            available_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            processed_at TIMESTAMPTZ,
            last_error TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_event_outbox_pending ON event_outbox(status, available_at);

        CREATE TABLE IF NOT EXISTS background_jobs (
            id BIGSERIAL PRIMARY KEY,
            job_type VARCHAR(100) NOT NULL,
            payload JSONB NOT NULL,
            status VARCHAR(24) NOT NULL DEFAULT 'pending',
            attempts INTEGER NOT NULL DEFAULT 0,
            max_attempts INTEGER NOT NULL DEFAULT 5,
            scheduled_for TIMESTAMPTZ NOT NULL DEFAULT now(),
            locked_at TIMESTAMPTZ,
            locked_by VARCHAR(120),
            completed_at TIMESTAMPTZ,
            last_error TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS ix_background_jobs_pending ON background_jobs(status, scheduled_for);

        CREATE OR REPLACE FUNCTION sevenf_set_updated_at()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;

        DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin_users;
        CREATE TRIGGER trg_admin_users_updated_at BEFORE UPDATE ON admin_users
            FOR EACH ROW EXECUTE FUNCTION sevenf_set_updated_at();
        DROP TRIGGER IF EXISTS trg_service_catalog_updated_at ON service_catalog;
        CREATE TRIGGER trg_service_catalog_updated_at BEFORE UPDATE ON service_catalog
            FOR EACH ROW EXECUTE FUNCTION sevenf_set_updated_at();
        DROP TRIGGER IF EXISTS trg_warranty_templates_updated_at ON warranty_templates;
        CREATE TRIGGER trg_warranty_templates_updated_at BEFORE UPDATE ON warranty_templates
            FOR EACH ROW EXECUTE FUNCTION sevenf_set_updated_at();
        DROP TRIGGER IF EXISTS trg_media_assets_updated_at ON media_assets;
        CREATE TRIGGER trg_media_assets_updated_at BEFORE UPDATE ON media_assets
            FOR EACH ROW EXECUTE FUNCTION sevenf_set_updated_at();
        DROP TRIGGER IF EXISTS trg_work_orders_updated_at ON work_orders;
        CREATE TRIGGER trg_work_orders_updated_at BEFORE UPDATE ON work_orders
            FOR EACH ROW EXECUTE FUNCTION sevenf_set_updated_at();
        DROP TRIGGER IF EXISTS trg_warranty_policies_updated_at ON warranty_policies;
        CREATE TRIGGER trg_warranty_policies_updated_at BEFORE UPDATE ON warranty_policies
            FOR EACH ROW EXECUTE FUNCTION sevenf_set_updated_at();
        DROP TRIGGER IF EXISTS trg_showcase_profiles_updated_at ON showcase_profiles;
        CREATE TRIGGER trg_showcase_profiles_updated_at BEFORE UPDATE ON showcase_profiles
            FOR EACH ROW EXECUTE FUNCTION sevenf_set_updated_at();
        """
    )


def downgrade() -> None:
    _execute_batch(
        """
        ALTER TABLE service_media DROP COLUMN IF EXISTS media_asset_id;
        DROP TABLE IF EXISTS background_jobs CASCADE;
        DROP TABLE IF EXISTS event_outbox CASCADE;
        DROP TABLE IF EXISTS conversions CASCADE;
        DROP TABLE IF EXISTS analytics_events CASCADE;
        DROP TABLE IF EXISTS showcase_social_proof CASCADE;
        DROP TABLE IF EXISTS showcase_profiles CASCADE;
        DROP TABLE IF EXISTS warranty_policies CASCADE;
        DROP TABLE IF EXISTS work_order_items CASCADE;
        DROP TABLE IF EXISTS work_orders CASCADE;
        DROP TABLE IF EXISTS scan_sessions CASCADE;
        DROP TABLE IF EXISTS workshop_profile CASCADE;
        DROP TABLE IF EXISTS media_assets CASCADE;
        DROP TABLE IF EXISTS warranty_templates CASCADE;
        DROP TABLE IF EXISTS service_catalog CASCADE;
        DROP TABLE IF EXISTS audit_log CASCADE;
        DROP TABLE IF EXISTS admin_sessions CASCADE;
        DROP TABLE IF EXISTS admin_users CASCADE;
        DROP FUNCTION IF EXISTS sevenf_set_updated_at();
        """
    )

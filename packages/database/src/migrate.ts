import { sqlClient } from './client';

async function runMigrations() {
  console.log('🔄 Initializing PostgreSQL extensions and logical schemas...');

  try {
    // 1. Enable extensions
    await sqlClient`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
    await sqlClient`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`;
    try {
      await sqlClient`CREATE EXTENSION IF NOT EXISTS "postgis";`;
    } catch (err: any) {
      console.warn('⚠️ PostGIS extension initialization note:', err.message);
    }

    // 2. Create logical schemas
    await sqlClient`CREATE SCHEMA IF NOT EXISTS sales;`;
    await sqlClient`CREATE SCHEMA IF NOT EXISTS billing;`;
    await sqlClient`CREATE SCHEMA IF NOT EXISTS fulfillment;`;
    await sqlClient`CREATE SCHEMA IF NOT EXISTS analytics;`;
    await sqlClient`CREATE SCHEMA IF NOT EXISTS portal;`;

    console.log('✅ Schemas (sales, billing, fulfillment, analytics, portal) verified.');

    // 3. Create all required tables if not exist
    // Enums in sales schema
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.user_role AS ENUM ('admin', 'sales_rep', 'sales_manager', 'finance', 'customer');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
      DO $$ BEGIN
        ALTER TYPE sales.user_role ADD VALUE IF NOT EXISTS 'customer';
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.customer_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.product_category AS ENUM ('hardware', 'services', 'subscription');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.quote_status AS ENUM ('draft', 'pending_approval', 'sent', 'under_negotiation', 'confirmed', 'fulfilled', 'cancelled', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.line_type AS ENUM ('one_time', 'recurring');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.approval_level AS ENUM ('level_1', 'level_2', 'level_3');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.approval_status AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;
    await sqlClient`
      DO $$ BEGIN
        CREATE TYPE sales.approval_decision AS ENUM ('pending', 'approved', 'rejected');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `;

    // Customer Tiers
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.customer_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(50) NOT NULL UNIQUE,
        code VARCHAR(20) NOT NULL UNIQUE,
        max_discount_pct NUMERIC(5,2) NOT NULL,
        approval_threshold_pct NUMERIC(5,2) NOT NULL,
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Users
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(320) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        role sales.user_role NOT NULL DEFAULT 'sales_rep',
        hashed_password TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Customers / Accounts
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        email VARCHAR(320) NOT NULL UNIQUE,
        company VARCHAR(255) NOT NULL,
        tier sales.customer_tier NOT NULL DEFAULT 'bronze',
        tier_id UUID REFERENCES sales.customer_tiers(id) ON DELETE SET NULL,
        credit_limit NUMERIC(12,2) NOT NULL DEFAULT 100000.00,
        location TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Products
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.products (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sku VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        category sales.product_category NOT NULL,
        base_price NUMERIC(12,2) NOT NULL,
        unit_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        unit VARCHAR(50) NOT NULL DEFAULT 'each',
        tax_rate NUMERIC(5,4) NOT NULL DEFAULT 0.0000,
        description TEXT,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Product Variants
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.product_variants (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL REFERENCES sales.products(id) ON DELETE CASCADE,
        name VARCHAR(255) NOT NULL,
        extra_price NUMERIC(12,2) NOT NULL DEFAULT 0.00
      );
    `;

    // Price Lists
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.price_lists (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(255) NOT NULL,
        tier_id UUID REFERENCES sales.customer_tiers(id) ON DELETE SET NULL,
        effective_date TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Price List Items
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.price_list_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        price_list_id UUID NOT NULL REFERENCES sales.price_lists(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES sales.products(id) ON DELETE RESTRICT,
        price NUMERIC(12,2) NOT NULL,
        CONSTRAINT price_list_items_uq UNIQUE (price_list_id, product_id)
      );
    `;

    // Discount Tiers
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.discount_tiers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_tier sales.customer_tier NOT NULL,
        category sales.product_category NOT NULL,
        max_discount_pct NUMERIC(5,2) NOT NULL,
        approval_threshold_pct NUMERIC(5,2) NOT NULL,
        approver_role sales.user_role NOT NULL,
        CONSTRAINT discount_tiers_tier_cat_uq UNIQUE (customer_tier, category)
      );
    `;

    // Discount Ceilings
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.discount_ceilings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        tier_id UUID NOT NULL REFERENCES sales.customer_tiers(id) ON DELETE CASCADE,
        category sales.product_category NOT NULL,
        max_discount_pct NUMERIC(5,2) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT discount_ceilings_tier_cat_uq UNIQUE (tier_id, category)
      );
    `;

    // Quotes
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_number VARCHAR(50) NOT NULL UNIQUE,
        rep_id UUID NOT NULL REFERENCES sales.users(id) ON DELETE RESTRICT,
        customer_id UUID NOT NULL REFERENCES sales.customers(id) ON DELETE RESTRICT,
        status sales.quote_status NOT NULL DEFAULT 'draft',
        blended_risk_score NUMERIC(5,4),
        brs_score NUMERIC(5,2),
        current_approval_step INTEGER DEFAULT 1,
        total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Ensure columns exist if table was already created
    await sqlClient`
      ALTER TABLE sales.quotes 
      ADD COLUMN IF NOT EXISTS brs_score NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS current_approval_step INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS cost_total NUMERIC(14,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS gross_margin_pct NUMERIC(5,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS counter_discount_pct NUMERIC(5,2);
    `;

    // Quote Lines
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.quote_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL REFERENCES sales.quotes(id) ON DELETE CASCADE,
        product_id UUID NOT NULL REFERENCES sales.products(id) ON DELETE RESTRICT,
        variant_id UUID REFERENCES sales.product_variants(id) ON DELETE SET NULL,
        quantity INTEGER NOT NULL CHECK (quantity > 0),
        unit_price NUMERIC(12,2) NOT NULL,
        unit_cost NUMERIC(12,2) DEFAULT 0.00,
        discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (discount_pct BETWEEN 0 AND 100),
        applied_ceiling_pct NUMERIC(5,2),
        violation_score NUMERIC(8,4) DEFAULT 0.0000,
        line_total NUMERIC(14,2) NOT NULL,
        gross_margin NUMERIC(14,2) DEFAULT 0.00,
        line_type sales.line_type NOT NULL DEFAULT 'one_time'
      );
    `;

    // Ensure columns exist on quote_lines if table already created
    await sqlClient`
      ALTER TABLE sales.quote_lines
      ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS applied_ceiling_pct NUMERIC(5,2),
      ADD COLUMN IF NOT EXISTS violation_score NUMERIC(8,4) DEFAULT 0.0000,
      ADD COLUMN IF NOT EXISTS gross_margin NUMERIC(14,2) DEFAULT 0.00;
    `;

    // Line Comments (Discussion & Redlining)
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.line_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_line_id UUID NOT NULL REFERENCES sales.quote_lines(id) ON DELETE CASCADE,
        author_id UUID,
        author_name VARCHAR(255) NOT NULL,
        author_role VARCHAR(50) NOT NULL,
        comment TEXT NOT NULL,
        suggested_discount_pct NUMERIC(5,2),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Product Recommendations (Affinity & Cross-sell)
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.product_recommendations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        source_product_id UUID NOT NULL REFERENCES sales.products(id) ON DELETE CASCADE,
        recommended_product_id UUID NOT NULL REFERENCES sales.products(id) ON DELETE CASCADE,
        relationship_type VARCHAR(50) NOT NULL DEFAULT 'cross_sell',
        reason TEXT NOT NULL,
        confidence_score NUMERIC(5,2) NOT NULL DEFAULT 0.85,
        margin_boost_pct NUMERIC(5,2) DEFAULT 5.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT product_recommendations_uq UNIQUE (source_product_id, recommended_product_id)
      );
    `;

    // Approvals
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.approvals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL REFERENCES sales.quotes(id) ON DELETE CASCADE,
        brs_score NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        approval_level sales.approval_level NOT NULL DEFAULT 'level_1',
        status sales.approval_status NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Approval Steps
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.approval_steps (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        approval_id UUID NOT NULL REFERENCES sales.approvals(id) ON DELETE CASCADE,
        step_order INTEGER NOT NULL,
        role_required sales.user_role NOT NULL,
        assigned_user_id UUID REFERENCES sales.users(id) ON DELETE SET NULL,
        decision sales.approval_decision NOT NULL DEFAULT 'pending',
        decision_reason TEXT,
        decided_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Audit Logs (with trigger to prevent update and delete)
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.audit_logs (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entity_type VARCHAR(100) NOT NULL,
        entity_id UUID NOT NULL,
        action VARCHAR(100) NOT NULL,
        actor_id UUID,
        actor_role VARCHAR(50),
        state_before JSONB,
        state_after JSONB,
        metadata JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Immutability Trigger on Audit Logs
    await sqlClient`
      CREATE OR REPLACE FUNCTION sales.prevent_audit_logs_mutation()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'sales.audit_logs is an immutable append-only table. Mutation (UPDATE/DELETE) is disallowed.';
      END;
      $$ LANGUAGE plpgsql;
    `;

    await sqlClient`
      DROP TRIGGER IF EXISTS trg_immutable_audit_logs ON sales.audit_logs;
    `;
    await sqlClient`
      CREATE TRIGGER trg_immutable_audit_logs
      BEFORE UPDATE OR DELETE ON sales.audit_logs
      FOR EACH ROW
      EXECUTE FUNCTION sales.prevent_audit_logs_mutation();
    `;

    // Portal Magic Links
    await sqlClient`
      CREATE TABLE IF NOT EXISTS portal.magic_links (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        quote_id UUID NOT NULL,
        email VARCHAR(320) NOT NULL,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Portal Negotiation Sessions
    await sqlClient`
      CREATE TABLE IF NOT EXISTS portal.negotiation_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL,
        session_token VARCHAR(128) NOT NULL UNIQUE,
        participant_email VARCHAR(320) NOT NULL,
        participant_name VARCHAR(255) NOT NULL,
        participant_role VARCHAR(50) NOT NULL DEFAULT 'customer',
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        last_active_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Billing Domain
    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        account_id UUID,
        quote_id UUID,
        quote_line_id UUID,
        product_id UUID,
        plan_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        monthly_amount NUMERIC(12,2) NOT NULL,
        amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
        mrr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        billing_interval VARCHAR(50) NOT NULL DEFAULT 'monthly',
        interval_days INTEGER NOT NULL DEFAULT 30,
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        next_billing_date TIMESTAMPTZ,
        auto_renew BOOLEAN NOT NULL DEFAULT true,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        renews_at TIMESTAMPTZ,
        cancelled_at TIMESTAMPTZ,
        cancellation_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sqlClient`
      ALTER TABLE billing.subscriptions
      ADD COLUMN IF NOT EXISTS account_id UUID,
      ADD COLUMN IF NOT EXISTS quote_id UUID,
      ADD COLUMN IF NOT EXISTS product_id UUID,
      ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS mrr NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS billing_interval VARCHAR(50) NOT NULL DEFAULT 'monthly',
      ADD COLUMN IF NOT EXISTS interval_days INTEGER NOT NULL DEFAULT 30,
      ADD COLUMN IF NOT EXISTS current_period_start TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS next_billing_date TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS auto_renew BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    `;

    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL,
        account_id UUID,
        quote_id UUID,
        invoice_type VARCHAR(50) NOT NULL DEFAULT 'one_time',
        total_amount NUMERIC(14,2) NOT NULL,
        subtotal NUMERIC(14,2) DEFAULT 0.00,
        tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        discount_amount NUMERIC(12,2) DEFAULT 0.00,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        due_date TIMESTAMPTZ NOT NULL,
        issued_at TIMESTAMPTZ DEFAULT now(),
        paid_at TIMESTAMPTZ,
        voided_at TIMESTAMPTZ,
        void_reason TEXT,
        voided_by UUID,
        sent_to VARCHAR(320),
        sent_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sqlClient`
      ALTER TABLE billing.invoices
      ADD COLUMN IF NOT EXISTS account_id UUID,
      ADD COLUMN IF NOT EXISTS invoice_type VARCHAR(50) NOT NULL DEFAULT 'one_time',
      ADD COLUMN IF NOT EXISTS subtotal NUMERIC(14,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12,2) DEFAULT 0.00,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT now(),
      ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS void_reason TEXT,
      ADD COLUMN IF NOT EXISTS voided_by UUID,
      ADD COLUMN IF NOT EXISTS sent_to VARCHAR(320),
      ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
      ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    `;

    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.invoice_lines (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES billing.invoices(id) ON DELETE CASCADE,
        quote_line_id UUID,
        product_id UUID,
        description TEXT NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 1,
        unit_price NUMERIC(12,2) NOT NULL,
        discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00,
        total_price NUMERIC(14,2) NOT NULL,
        fulfillment_required BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.billing_schedules (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscription_id UUID NOT NULL REFERENCES billing.subscriptions(id) ON DELETE CASCADE,
        schedule_date TIMESTAMPTZ NOT NULL,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        due_date TIMESTAMPTZ NOT NULL,
        amount NUMERIC(14,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        attempt_count INTEGER NOT NULL DEFAULT 0,
        invoice_id UUID,
        invalidated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.credit_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        credit_note_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID,
        account_id UUID,
        subscription_id UUID REFERENCES billing.subscriptions(id) ON DELETE SET NULL,
        invoice_id UUID REFERENCES billing.invoices(id) ON DELETE SET NULL,
        amount NUMERIC(14,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        reason TEXT NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'issued',
        issued_by UUID,
        issued_at TIMESTAMPTZ DEFAULT now(),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    await sqlClient`
      ALTER TABLE billing.credit_notes
      ADD COLUMN IF NOT EXISTS credit_note_number VARCHAR(50),
      ADD COLUMN IF NOT EXISTS customer_id UUID,
      ADD COLUMN IF NOT EXISTS account_id UUID,
      ADD COLUMN IF NOT EXISTS subscription_id UUID REFERENCES billing.subscriptions(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) NOT NULL DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'issued',
      ADD COLUMN IF NOT EXISTS issued_by UUID,
      ADD COLUMN IF NOT EXISTS issued_at TIMESTAMPTZ DEFAULT now();
    `;

    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES billing.invoices(id) ON DELETE RESTRICT,
        customer_id UUID NOT NULL,
        account_id UUID,
        amount NUMERIC(14,2) NOT NULL,
        currency VARCHAR(10) NOT NULL DEFAULT 'USD',
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        payment_method VARCHAR(50) NOT NULL DEFAULT 'card',
        gateway_transaction_id VARCHAR(255),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // Ensure delivery coordinates exist on customers
    await sqlClient`
      ALTER TABLE sales.customers
      ADD COLUMN IF NOT EXISTS delivery_latitude NUMERIC(10,6),
      ADD COLUMN IF NOT EXISTS delivery_longitude NUMERIC(10,6);
    `;

    // Fulfillment Domain
    await sqlClient`
      CREATE TABLE IF NOT EXISTS fulfillment.warehouses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        code VARCHAR(50) NOT NULL UNIQUE,
        name VARCHAR(255) NOT NULL,
        address VARCHAR(500),
        latitude NUMERIC(10,6),
        longitude NUMERIC(10,6),
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS fulfillment.warehouse_stock (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        warehouse_id UUID NOT NULL REFERENCES fulfillment.warehouses(id) ON DELETE CASCADE,
        product_id UUID NOT NULL,
        available_qty INTEGER NOT NULL DEFAULT 0 CHECK (available_qty >= 0),
        reserved_qty INTEGER NOT NULL DEFAULT 0 CHECK (reserved_qty >= 0),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT warehouse_stock_wh_prod_idx UNIQUE (warehouse_id, product_id)
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS fulfillment.fulfillment_splits (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL,
        quote_line_id UUID,
        product_id UUID NOT NULL,
        warehouse_id UUID NOT NULL REFERENCES fulfillment.warehouses(id) ON DELETE CASCADE,
        allocated_qty INTEGER NOT NULL DEFAULT 1,
        shipping_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
        distance_km NUMERIC(10,2) NOT NULL DEFAULT 0.00,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        carrier VARCHAR(100),
        tracking_number VARCHAR(100),
        estimated_delivery_days INTEGER DEFAULT 3,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS fulfillment.backorders (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL,
        productId UUID NOT NULL,
        requested_qty INTEGER NOT NULL,
        allocated_qty INTEGER NOT NULL DEFAULT 0,
        backorder_qty INTEGER NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'open',
        estimated_restock_date TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;

    // PostGIS Distance Calculation Helper Function
    await sqlClient`
      CREATE OR REPLACE FUNCTION fulfillment.calculate_distance_km(
        lat1 NUMERIC, lon1 NUMERIC,
        lat2 NUMERIC, lon2 NUMERIC
      ) RETURNS NUMERIC AS $$
      BEGIN
        IF lat1 IS NULL OR lon1 IS NULL OR lat2 IS NULL OR lon2 IS NULL THEN
          RETURN 0.00;
        END IF;
        -- ST_DistanceSphere returns meters; divide by 1000 for kilometers
        RETURN ROUND((ST_DistanceSphere(ST_MakePoint(lon1, lat1), ST_MakePoint(lon2, lat2)) / 1000.0)::numeric, 2);
      END;
      $$ LANGUAGE plpgsql IMMUTABLE;
    `;

    // Analytics Domain
    await sqlClient`
      CREATE TABLE IF NOT EXISTS analytics.price_history (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        product_id UUID NOT NULL,
        old_price NUMERIC(12,2),
        new_price NUMERIC(12,2) NOT NULL,
        changed_by UUID,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS analytics.quote_events (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_id UUID NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        payload JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS analytics.rep_discount_tracking (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        time TIMESTAMPTZ NOT NULL DEFAULT now(),
        rep_id UUID NOT NULL,
        quote_id UUID NOT NULL,
        category VARCHAR(50) NOT NULL,
        applied_discount_pct NUMERIC(5,2) NOT NULL,
        tier_ceiling_pct NUMERIC(5,2) NOT NULL
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS analytics.deal_health_metrics (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        time TIMESTAMPTZ NOT NULL DEFAULT now(),
        quote_id UUID NOT NULL,
        status VARCHAR(50) NOT NULL,
        days_since_update NUMERIC(6,2) NOT NULL,
        blended_risk_score NUMERIC(5,4)
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS analytics.inventory_snapshots (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        time TIMESTAMPTZ NOT NULL DEFAULT now(),
        warehouse_id UUID NOT NULL,
        product_id UUID NOT NULL,
        available_qty NUMERIC(10,2) NOT NULL DEFAULT 0,
        reserved_qty NUMERIC(10,2) NOT NULL DEFAULT 0
      );
    `;

    // Continuous Aggregates (with standard view fallback if TimescaleDB extension is not installed)
    try {
      await sqlClient`
        CREATE OR REPLACE VIEW analytics.rep_discount_stats_30d AS
        SELECT
          rep_id,
          category,
          DATE_TRUNC('day', time) AS day,
          AVG(applied_discount_pct) AS avg_discount,
          STDDEV(applied_discount_pct) AS stddev_discount,
          MIN(applied_discount_pct) AS min_discount,
          MAX(applied_discount_pct) AS max_discount,
          COUNT(*) AS line_count
        FROM analytics.rep_discount_tracking
        GROUP BY rep_id, category, DATE_TRUNC('day', time);
      `;
      await sqlClient`
        CREATE OR REPLACE VIEW analytics.quote_velocity_1h AS
        SELECT
          DATE_TRUNC('hour', created_at) AS bucket,
          COUNT(*) FILTER (WHERE event_type = 'quote.submitted') AS submitted,
          COUNT(*) FILTER (WHERE event_type = 'quote.approved') AS approved,
          COUNT(*) FILTER (WHERE event_type = 'quote.confirmed') AS confirmed,
          COUNT(*) FILTER (WHERE event_type = 'quote.rejected') AS rejected
        FROM analytics.quote_events
        GROUP BY DATE_TRUNC('hour', created_at);
      `;
    } catch (err: any) {
      console.warn('⚠️ Analytics views creation note:', err.message);
    }


    console.log('✅ All PostgreSQL database tables migrated successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigrations();

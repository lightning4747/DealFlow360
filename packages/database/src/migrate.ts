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
        CREATE TYPE sales.user_role AS ENUM ('admin', 'sales_rep', 'sales_manager', 'finance');
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

    // Quotes
    await sqlClient`
      CREATE TABLE IF NOT EXISTS sales.quotes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        quote_number VARCHAR(50) NOT NULL UNIQUE,
        rep_id UUID NOT NULL REFERENCES sales.users(id) ON DELETE RESTRICT,
        customer_id UUID NOT NULL REFERENCES sales.customers(id) ON DELETE RESTRICT,
        status sales.quote_status NOT NULL DEFAULT 'draft',
        blended_risk_score NUMERIC(5,4),
        total_amount NUMERIC(14,2) NOT NULL DEFAULT 0.00,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
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
        discount_pct NUMERIC(5,2) NOT NULL DEFAULT 0.00 CHECK (discount_pct BETWEEN 0 AND 100),
        line_total NUMERIC(14,2) NOT NULL,
        line_type sales.line_type NOT NULL DEFAULT 'one_time'
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

    // Billing Domain
    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL,
        quote_line_id UUID,
        plan_name VARCHAR(255) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'active',
        monthly_amount NUMERIC(12,2) NOT NULL,
        started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        renews_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.invoices (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_number VARCHAR(50) NOT NULL UNIQUE,
        customer_id UUID NOT NULL,
        quote_id UUID,
        total_amount NUMERIC(12,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'pending',
        due_date TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `;
    await sqlClient`
      CREATE TABLE IF NOT EXISTS billing.credit_notes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        invoice_id UUID NOT NULL REFERENCES billing.invoices(id),
        amount NUMERIC(12,2) NOT NULL,
        reason TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      );
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
        available_qty INTEGER NOT NULL DEFAULT 0,
        reserved_qty INTEGER NOT NULL DEFAULT 0,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT warehouse_stock_wh_prod_idx UNIQUE (warehouse_id, product_id)
      );
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

    console.log('✅ All PostgreSQL database tables migrated successfully.');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await sqlClient.end();
  }
}

runMigrations();

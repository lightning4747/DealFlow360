# Phase 1 — Foundation & Core Infrastructure

> **Document ID:** DF360-PHASE-01  
> **Version:** 1.0.0  
> **Status:** APPROVED  
> **Target Delivery:** Sprint 1–2  
> **Owner:** Lead Systems Architect & Infrastructure Lead

---

## 1. Executive Summary & Phase Goal

Phase 1 establishes the rock-solid technical substrate for the **DealFlow360** B2B Enterprise Quotation Platform. The primary objective is to instantiate the entire containerized poly-store ecosystem, configure strict database schema topologies across five logical domains, deploy the declarative Kong API Gateway with JWT and rate-limiting enforcement, set up the Better Auth identity layer (supporting both enterprise session tokens and external customer magic links), and deliver complete, production-ready Master Data APIs (Products, Price Lists, Customer Tiers) alongside an enterprise management interface built with Next.js 14, Tailwind CSS, and Shadcn UI.

By the conclusion of Phase 1, the platform will have a running local and staging environment capable of routing authenticated, rate-governed traffic through Kong to NestJS bounded context modules, persisting typed entities via Drizzle ORM across isolated PostgreSQL schemas, and managing foundational pricing catalogs required by downstream quotation engines.

```mermaid
graph TB
    subgraph INGRESS["Ingress & Gateway Layer"]
        CLIENT["Browser Client / Admin / Rep"] -->|Port 8000| KONG["Kong API Gateway (v3.6)\n• JWT Plugin\n• Rate-Limiting Plugin\n• Request ID (X-Correlation-ID)\n• CORS"]
    end

    subgraph BACKEND["Application Monolith (NestJS 10)"]
        KONG -->|Reverse Proxy :3000| AUTH_MOD["AuthModule\n(Better Auth + Magic Link)"]
        KONG -->|Reverse Proxy :3000| PROD_MOD["ProductsModule"]
        KONG -->|Reverse Proxy :3000| TIER_MOD["CustomerTiersModule"]
        KONG -->|Reverse Proxy :3000| PRICE_MOD["PriceListsModule"]
    end

    subgraph STORAGE["Data & Event Storage Tier"]
        AUTH_MOD & PROD_MOD & TIER_MOD & PRICE_MOD -->|Drizzle ORM| PG[("PostgreSQL 16\nExtensions: PostGIS 3.4, TimescaleDB\nSchemas: sales, billing, fulfillment, analytics, portal")]
        AUTH_MOD -->|Token Store & Cache| REDIS[("Redis 7.2 (Standalone)")]
        BACKEND -.->|Bootstrap Check| KAFKA[("Kafka KRaft Cluster\n3 Brokers / Port 9092")]
        BACKEND -.->|Search Index Ready| ES[("Elasticsearch 8.12\nPort 9200")]
    end
```

---

## 2. Exact Prerequisites & Input Documents

All architectural specifications, database models, and API interfaces for Phase 1 are formally defined in the following project documents:

| Specification Document | Target Anchor / Section | Purpose for Phase 1 |
|---|---|---|
| [01-SYSTEM_ARCHITECTURE.md](file:///home/bow/projects/DealFlow360/docs/01-SYSTEM_ARCHITECTURE.md) | §3, §4.1, §5, §6, §8, §9 | Monorepo layout, Kong gateway topology, schema boundaries, technology justification. |
| [02-DATABASE_SCHEMA.md](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md) | §1, §2, §3.1, §4, §5, §6, §7 | Postgres extensions (`uuid-ossp`, `postgis`, `timescaledb`), schema provisioning (`sales`, `billing`, `fulfillment`, `analytics`, `portal`), initial Drizzle tables (`users`, `accounts`, `products`, `price_lists`, `customer_tiers`). |
| [03-REST_API_OPENAPI.md](file:///home/bow/projects/DealFlow360/docs/03-REST_API_OPENAPI.md) | §2.1 (Auth), §2.2 (Products), §2.3 (Price Lists), §2.4 (Customer Tiers) | Canonical OpenAPI schemas, status codes, query parameters, and payload structures. |
| [07-AUTH_SECURITY_RBAC.md](file:///home/bow/projects/DealFlow360/docs/07-AUTH_SECURITY_RBAC.md) | §1, §2, §3, §4, §5 | Better Auth session model, JWT signing keys, HttpOnly cookie directives, Magic Link HMAC signing, RBAC role-permission matrix. |
| [Tech-stack.md](file:///home/bow/projects/DealFlow360/docs/Tech-stack.md) | All | Locked package versions for Next.js, Shadcn, NestJS, Drizzle ORM, KafkaJS, and BullMQ. |

---

## 3. Component-by-Component Implementation Checklist

### 3.1 Infrastructure & Docker Compose Setup
- [ ] Deploy multi-container orchestration via `docker-compose.yml`:
  - [ ] **PostgreSQL 16** with PostGIS 3.4 and TimescaleDB pre-installed.
  - [ ] **Redis 7.2-alpine** configured with AOF persistence enabled (`appendonly yes`).
  - [ ] **Kafka in KRaft mode** (no ZooKeeper, single-node broker for local dev, image `confluentinc/cp-kafka:7.6.0`).
  - [ ] **Kong API Gateway 3.6** running in DB-less (declarative) mode.
  - [ ] **Elasticsearch 8.12.0** running single-node with security disabled for dev (`discovery.type=single-node`, `xpack.security.enabled=false`).
  - [ ] **Admin tooling:** Kafka UI (`provectuslabs/kafka-ui`), pgAdmin or CloudBeaver (optional dev profile).
- [ ] Define shared Docker volumes: `pg_data`, `redis_data`, `kafka_data`, `es_data`.
- [ ] Define standard health check directives for all services with zero-downtime dependency chaining (`service_healthy`).

### 3.2 Database Schema & Drizzle ORM Provisioning
- [ ] Configure `drizzle.config.ts` filtering schemas: `sales`, `billing`, `fulfillment`, `analytics`, `portal`.
- [ ] Implement initial migration script `0000_core_extensions_and_schemas.sql`:
  - [ ] Enable PostgreSQL extensions: `uuid-ossp`, `pgcrypto`, `postgis`, `timescaledb CASCADE`.
  - [ ] Provision logical schemas: `CREATE SCHEMA IF NOT EXISTS sales;`, `billing;`, `fulfillment;`, `analytics;`, `portal;`.
- [ ] Implement Drizzle table definitions in `src/db/schema/`:
  - [ ] [`sales.accounts`](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md#L83-L105): Enterprise customer accounts with `credit_limit`, `tier_id`, `shipping_address`, `location` (PostGIS `geometry(Point, 4326)`).
  - [ ] [`sales.users`](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md#L107-L135): Internal sales reps, managers, finance officers, admins.
  - [ ] [`sales.customer_tiers`](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md#L137-L160): Tier levels (`Standard`, `Silver`, `Gold`, `Platinum`) with default discount ceilings.
  - [ ] [`sales.products`](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md#L162-L195): SKU, product type (`hardware`, `service`, `subscription`), list price, unit cost, category.
  - [ ] [`sales.price_lists`](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md#L197-L225) & [`sales.price_list_items`](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md#L227-L255): Tiered and custom customer pricing overrides.
  - [ ] [`portal.magic_links`](file:///home/bow/projects/DealFlow360/docs/02-DATABASE_SCHEMA.md#L780-L815): Token hashes, quote bindings, expiration, usage timestamps.
- [ ] Generate typed Zod schemas for all tables using `drizzle-zod` (`createInsertSchema`, `createSelectSchema`).

### 3.3 Better Auth & Authentication Engine
- [ ] Initialize Better Auth backend configuration within `AuthModule`:
  - [ ] Session strategy: Dual-token mechanism (15-minute RS256 JWT Access Token + 7-day Rotating Refresh Token stored in Redis and delivered via `HttpOnly`, `SameSite=Strict`, `Secure` cookies).
  - [ ] User roles & RBAC context: `sales_rep`, `sales_manager`, `finance`, `ops_manager`, `admin`, `customer`.
- [ ] Customer Portal Magic Link Service:
  - [ ] Cryptographic token generation: `crypto.randomBytes(32).toString('hex')`.
  - [ ] Token storage: SHA-256 hashed value stored in `portal.magic_links` with 72-hour TTL.
  - [ ] Nodemailer transport configured for sending transactional verification emails with one-click portal authentication URL.
- [ ] NestJS Authentication Guards & Decorators:
  - [ ] `@CurrentUser()` parameter decorator.
  - [ ] `JwtAuthGuard` validating bearer token claims extracted from Kong gateway headers or direct authorization headers.
  - [ ] `RolesGuard` checking `@Roles(Role.SALES_MANAGER, Role.FINANCE)`.
  - [ ] `MagicLinkAuthGuard` handling portal stateless authentication.

### 3.4 Kong API Gateway Declarative Routing
- [ ] Create declarative Kong configuration `kong/kong.yml`:
  - [ ] Service: `dealflow360-api` pointed at `http://backend:3000`.
  - [ ] Route `/api/v1/auth` -> strips prefix, passes through to `AuthModule`.
  - [ ] Route `/api/v1/sales` -> enforces `jwt` and `rate-limiting` plugins.
  - [ ] Route `/api/v1/portal` -> applies external rate-limiting (30 req/min) and custom header injection.
- [ ] Configure global Kong plugins:
  - [ ] `correlation-id` (`request-id` plugin injecting `X-Correlation-ID: <uuid>`).
  - [ ] `cors` enabling credentials and white-listing internal sales web app and customer portal origins.
  - [ ] `rate-limiting` configuring tier limits (100 req/min for authenticated reps, 30 req/min for portal).

### 3.5 Master Data Backend Modules (NestJS)
- [ ] **ProductsModule:**
  - [ ] `POST /api/v1/sales/products` — Create SKU with category, unit cost, list price, type.
  - [ ] `GET /api/v1/sales/products` — Paginated search, category filtering, full-text SKU search.
  - [ ] `GET /api/v1/sales/products/:id` — Detailed product view with active pricing.
  - [ ] `PATCH /api/v1/sales/products/:id` — Update list price, cost, or activation state.
  - [ ] `DELETE /api/v1/sales/products/:id` — Soft-delete / deactivate product.
- [ ] **CustomerTiersModule:**
  - [ ] `POST /api/v1/sales/customer-tiers` — Define tier name, code, default discount ceiling.
  - [ ] `GET /api/v1/sales/customer-tiers` — Fetch active tier matrix.
  - [ ] `PATCH /api/v1/sales/customer-tiers/:id` — Adjust ceiling parameters.
- [ ] **PriceListsModule:**
  - [ ] `POST /api/v1/sales/price-lists` — Create custom or tier-bound price list.
  - [ ] `POST /api/v1/sales/price-lists/:id/items` — Bulk upload custom SKU prices.
  - [ ] `GET /api/v1/sales/price-lists/:id` — Fetch price list with overrides.

### 3.6 Frontend Master Data Management UI (Next.js 14)
- [ ] Layout & Design System:
  - [ ] Setup Next.js App Router workspace with Tailwind CSS and Shadcn UI primitives (`Button`, `Table`, `Dialog`, `DropdownMenu`, `Badge`, `Card`, `Input`, `Form`).
  - [ ] Responsive navigation sidebar (`/admin/products`, `/admin/price-lists`, `/admin/tiers`).
- [ ] Product Catalog Management (`/admin/products`):
  - [ ] Server-side paginated data table with sorting, category filters, and search bar.
  - [ ] Product Creation Dialog with React Hook Form + Zod schema validation.
  - [ ] Inline status toggle (Active/Archived) using optimistic TanStack Query mutations.
- [ ] Customer Tier & Ceiling Matrix (`/admin/tiers`):
  - [ ] Visual ceiling editor displaying discount thresholds per product category.
  - [ ] Audit badge indicating last modified by user and timestamp.
- [ ] Price List Manager (`/admin/price-lists`):
  - [ ] Price list item editor with CSV import preview for SKU overrides.

---

## 4. Step-by-Step Execution Plan

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Platform Engineer
    participant Docker as Docker Compose Engine
    participant DB as Postgres (Drizzle Migrations)
    participant Kong as Kong API Gateway
    participant Nest as NestJS Monolith
    participant UI as Next.js Admin UI

    Dev->>Docker: docker compose up -d (pg, redis, kafka, kong, es)
    Docker-->>Dev: All healthchecks green
    Dev->>DB: pnpm db:migrate (run 0000_core_extensions_and_schemas.sql)
    DB-->>Dev: Extensions enabled, schemas & tables verified
    Dev->>Kong: decK sync -s kong/kong.yml (or Kong DB-less boot)
    Kong-->>Dev: Routes & plugins initialized
    Dev->>Nest: pnpm start:dev (Backend API)
    Nest->>DB: Test connection pool & Drizzle ORM bootstrap
    Nest->>Docker: Verify Kafka KRaft broker connection
    Dev->>UI: pnpm dev (Admin Sales App)
    UI->>Kong: POST /api/v1/auth/login
    Kong->>Nest: Route to AuthModule
    Nest-->>UI: Set HttpOnly cookie + Return JWT
    UI->>Kong: POST /api/v1/sales/products
    Kong->>Nest: Validate JWT -> Route to ProductsModule
    Nest->>DB: INSERT INTO sales.products
    DB-->>UI: 201 Created & Table Refreshed
```

### Step 1: Environment & Orchestration Initialization
1. Create `.env.example` defining all environment variables:
   ```env
   NODE_ENV=development
   PORT=3000
   DATABASE_URL=postgresql://dealflow_user:dealflow_secret@localhost:5432/dealflow360
   REDIS_URL=redis://localhost:6379
   KAFKA_BROKERS=localhost:9092
   ELASTICSEARCH_NODE=http://localhost:9200
   JWT_SECRET=super-secret-jwt-signing-key-minimum-32-chars
   REFRESH_SECRET=super-secret-refresh-signing-key-minimum-32-chars
   MAGIC_LINK_SECRET=super-secret-magic-link-hmac-salt
   KONG_ADMIN_URL=http://localhost:8001
   FRONTEND_URL=http://localhost:3001
   PORTAL_URL=http://localhost:3002
   ```
2. Write production-ready `docker-compose.yml` mounting standard configuration files.
3. Execute `docker compose up -d` and verify service readiness using standard CLI commands:
   ```bash
   docker compose ps
   docker compose exec postgres pg_isready -U dealflow_user
   docker compose exec redis redis-cli ping
   ```

### Step 2: Drizzle Schema Migration & Database Seed
1. Write Drizzle schema definitions in `libs/db/src/schema/`:
   - `sales.schema.ts`
   - `billing.schema.ts`
   - `fulfillment.schema.ts`
   - `analytics.schema.ts`
   - `portal.schema.ts`
2. Generate migration SQL files:
   ```bash
   pnpm --filter @dealflow/db drizzle-kit generate
   ```
3. Execute the migrations against PostgreSQL 16:
   ```bash
   pnpm --filter @dealflow/db drizzle-kit migrate
   ```
4. Run standard database seed script `libs/db/src/seeds/phase1_seed.ts` populating:
   - 4 Customer Tiers: `Standard` (10% ceiling), `Silver` (15% ceiling), `Gold` (25% ceiling), `Platinum` (35% ceiling).
   - 20 Base Products across Hardware, SaaS Subscriptions, and Professional Services.
   - 1 Admin User, 2 Sales Reps, 1 Sales Manager, 1 Finance Officer.

### Step 3: Better Auth Implementation & Kong Ingress Verification
1. Implement `AuthService` in `apps/api/src/modules/auth/` handling user credentials, password hashing via `argon2`, and Better Auth session lifecycle.
2. Build `KongJwtStrategy` to extract and validate access tokens injected via `Authorization: Bearer <jwt>`.
3. Configure `kong/kong.yml` with the following service/route manifest:
   ```yaml
   _format_version: "3.0"
   services:
     - name: dealflow-api
       url: http://backend:3000
       routes:
         - name: auth-route
           paths: ["/api/v1/auth"]
           strip_path: false
         - name: sales-route
           paths: ["/api/v1/sales"]
           strip_path: false
           plugins:
             - name: jwt
             - name: rate-limiting
               config:
                 minute: 120
                 policy: redis
                 redis_host: redis
                 redis_port: 6379
   plugins:
     - name: correlation-id
       config:
         header_name: X-Correlation-ID
         generator: uuid
         echo_downstream: true
     - name: cors
       config:
         origins: ["http://localhost:3001", "http://localhost:3002"]
         credentials: true
   ```

### Step 4: Master Data CRUD API Implementation
1. Develop NestJS `ProductsController` with Zod validation pipe:
   ```typescript
   @Controller('sales/products')
   @UseGuards(JwtAuthGuard, RolesGuard)
   export class ProductsController {
     constructor(private readonly productsService: ProductsService) {}

     @Post()
     @Roles(Role.ADMIN, Role.SALES_MANAGER)
     async create(@Body(new ZodValidationPipe(CreateProductSchema)) dto: CreateProductDto) {
       return this.productsService.create(dto);
     }

     @Get()
     async findAll(@Query() query: ProductFilterDto) {
       return this.productsService.findAll(query);
     }
   }
   ```
2. Implement corresponding controllers for `CustomerTiersController` and `PriceListsController`.

### Step 5: Frontend Admin UI Implementation
1. Scaffold Next.js 14 project using App Router in `apps/sales-fe/`.
2. Configure Tailwind CSS color palette, typography, and Radix/Shadcn UI component registry.
3. Build API client wrapper utilizing `fetch` with automatic bearer token propagation and response error interception.
4. Implement master data pages:
   - `apps/sales-fe/src/app/(dashboard)/admin/products/page.tsx`
   - `apps/sales-fe/src/app/(dashboard)/admin/tiers/page.tsx`
   - `apps/sales-fe/src/app/(dashboard)/admin/price-lists/page.tsx`

---

## 5. Empirical Verification & Test Suite Requirements

To guarantee enterprise compliance and functional completeness, Phase 1 requires automated verification across three test tiers:

```
                      ┌─────────────────────────────────┐
                      │    E2E Ingress & Flow Tests     │  (Kong + NestJS + DB)
                      ├─────────────────────────────────┤
                      │   Integration Component Tests   │  (DB Migrations, Redis, Auth)
                      ├─────────────────────────────────┤
                      │     Isolated Unit Tests         │  (Zod Schemas, Token Crypto)
                      └─────────────────────────────────┘
```

### 5.1 Unit Tests (`pnpm test:unit`)
- **Zod Schema Tests:** Verify validation boundaries for `CreateProductDto`, `UpdateTierCeilingDto`, and `CreatePriceListDto` (e.g., negative prices rejected, empty SKUs disallowed, percentage ceilings bounded strictly between 0.00 and 100.00).
- **Token Crypto Tests:** Verify Magic Link generation, HMAC SHA-256 hash matching, and deterministic expiration timestamps.
- **Role Permission Tests:** Assert RBAC hierarchy (`Role.ADMIN` has super-set permissions over `Role.SALES_REP`).

### 5.2 Integration Tests (`pnpm test:integration`)
- **PostgreSQL Extension & Schema Integrity:**
  - Assert that `postgis`, `uuid-ossp`, `pgcrypto`, and `timescaledb` exist in `pg_extension`.
  - Assert all 5 schemas exist in `information_schema.schemata`.
  - Assert foreign key cascades and generated column expressions function correctly in `sales.accounts` and `sales.products`.
- **Redis Session Storage:** Assert that refresh tokens can be stored, retrieved, and invalidated via Redis client with correct TTLs.
- **Kafka Connectivity:** Assert that NestJS microservice bootstrap can successfully connect to Kafka KRaft broker on port 9092 and query cluster metadata.

### 5.3 End-to-End Flow Tests (`pnpm test:e2e`)
- **Kong Ingress & Rate Limiting:**
  - Send unauthenticated request to `/api/v1/sales/products` through Kong port 8000 -> Expect `401 Unauthorized`.
  - Send POST to `/api/v1/auth/login` -> Receive 200 OK with `Set-Cookie` and JWT token.
  - Send authenticated GET request with JWT through Kong -> Expect `200 OK` and header `X-Correlation-ID` present.
  - Burst 125 requests in 60 seconds with JWT -> Assert requests 121–125 receive `429 Too Many Requests`.
- **Master Data Flow:**
  - Rep logs in -> Creates a new product `SKU-TEST-001` with List Price \$1,500.00.
  - Creates a Price List override for `Gold` tier at \$1,200.00.
  - Fetches product details as sales rep -> Asserts base and overridden prices match expected values.

---

## 6. Definition of Done (DoD)

Phase 1 is officially completed and marked **DONE** only when all of the following criteria are met:

1. [ ] `docker compose up -d` starts PostgreSQL 16 (with PostGIS and TimescaleDB), Redis 7.2, Kafka KRaft, Kong 3.6, and Elasticsearch 8.12 with all health checks reporting `healthy`.
2. [ ] All Drizzle migrations execute cleanly from scratch on an empty database with zero errors; all 5 logical schemas (`sales`, `billing`, `fulfillment`, `analytics`, `portal`) are properly provisioned.
3. [ ] Seed script successfully inserts baseline tiers, products, and RBAC users.
4. [ ] Kong API Gateway handles routing, injects `X-Correlation-ID` on all incoming requests, enforces JWT validation on `/api/v1/sales/*`, and enforces rate limits.
5. [ ] Better Auth provides functional authentication with HttpOnly refresh cookies, rotating JWTs, and secure customer magic link tokens.
6. [ ] CRUD APIs for Products, Customer Tiers, and Price Lists are fully implemented, tested with 100% route coverage, and conform to OpenAPI specs in `03-REST_API_OPENAPI.md`.
7. [ ] Next.js 14 Admin UI allows viewing, filtering, creating, and modifying Products, Tiers, and Price Lists with full form validation and feedback.
8. [ ] All unit, integration, and E2E test suites pass with zero regressions (`100% green`).

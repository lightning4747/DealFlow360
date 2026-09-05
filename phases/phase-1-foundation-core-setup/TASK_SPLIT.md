# Task Breakdown & Delivery Matrix — Foundation & Core Infrastructure

> **Status:** Complete  
> **Phase Scope:** Container Orchestration, Logical Database Schemas, Master Data CRUD, Authentication, and Administration UI

---

## 1. Task Distribution Matrix

| Workstream | Domain | Key Responsibilities | Deliverables | Status |
|---|---|---|---|:---:|
| **Infrastructure** | DevOps & Ingress | Container ecosystem, reverse proxy, gateway security, networking | `docker-compose.yml`, `docker/kong/kong.yml`, `.env` | ✅ Complete |
| **Database** | Persistence & ORM | Schemas across 5 logical domains, migrations, relational seeding | `packages/database/src/schema/*`, `src/migrate.ts`, `src/seeds/seed.ts` | ✅ Complete |
| **Backend** | API Services & Auth | NestJS bootstrap, Master Data CRUD, JWT/Magic-link authentication | `apps/api/src/modules/*`, `apps/api/test/*` | ✅ Complete |
| **Frontend** | Master Data UI | Next.js 14 App Router administration workspace | `apps/web/app/admin/*` | ✅ Complete |

---

## 2. Granular Task Breakdown

### 2.1 Database (DB)
- [x] Configure Drizzle ORM to manage 5 logical schemas: `sales`, `billing`, `fulfillment`, `analytics`, `portal`.
- [x] Enable PostgreSQL extensions (`uuid-ossp`, `pgcrypto`, `postgis`).
- [x] Implement Drizzle schema models:
  - `sales.users`: User accounts with roles (`admin`, `sales_rep`, `sales_manager`, `finance`) and bcrypt hashes.
  - `sales.customer_tiers`: Commercial tiers with maximum discount ceilings and approval trigger percentages.
  - `sales.customers`: Enterprise customer accounts with credit limits and location coordinates.
  - `sales.products` & `sales.product_variants`: Product catalog across Hardware, Subscriptions, and Professional Services.
  - `sales.price_lists` & `sales.price_list_items`: Tiered and custom contracted pricing overrides.
  - `sales.quotes` & `sales.quote_lines`: Quotation entities and line items.
  - `sales.audit_logs`: Immutable audit logging entity.
  - `portal.magic_links`: Customer negotiation magic link tokens and expiration timestamps.
  - `billing.*`, `fulfillment.*`, `analytics.*`: Scaffolding tables for future domain phases.
- [x] Generate and execute initial database migration script.
- [x] Create deterministic database seeder inserting 4 customer tiers, 20 products, 5 RBAC users, and custom price overrides.

### 2.2 Backend (API & Services)
- [x] Initialize NestJS 10 application structure with root `AppModule` and `DatabaseModule`.
- [x] Implement persistent CRUD endpoints for `ProductsModule` with category filtering, search, and soft deletion.
- [x] Implement persistent CRUD endpoints for `CustomerTiersModule` with ceiling adjustments.
- [x] Implement persistent CRUD endpoints for `PriceListsModule` with bulk item overrides.
- [x] Implement `AuthModule` handling bcrypt password comparison, 15-minute JWT access tokens, and Redis refresh sessions.
- [x] Implement customer portal magic link generation (SHA-256 hash storage) and single-use verification logic.
- [x] Configure NestJS global `AllExceptionsFilter` for unified `{ data, meta, error }` response envelopes.
- [x] Add `CorrelationIdMiddleware` for tracing requests across service boundaries.
- [x] Develop automated test suites: DTO validation boundaries, Authentication & Magic Links, and PostgreSQL service integration.

### 2.3 Infrastructure & Ingress (Infra)
- [x] Multi-container Docker Compose configuration: PostgreSQL 16 (with PostGIS and TimescaleDB), Redis 7.2, Kafka KRaft, Elasticsearch 8.11, Kong Gateway 3.9, and Kafka UI.
- [x] Resolve host port conflicts by mapping PostgreSQL to port `5433:5432` with environment fallbacks.
- [x] Configure Kong Gateway in DB-less mode with routes for internal auth, sales APIs, and customer portal.
- [x] Configure Kong plugins: `correlation-id` (`X-Correlation-ID`), `rate-limiting` (100 req/min for sales, 30 req/min for portal, 60 req/min for auth), `cors`, and security headers.
- [x] Enable Docker `host.docker.internal` host-gateway bridge for Kong upstream reverse proxying on Linux.
- [x] Verify zero-downtime healthcheck status across all active containers.

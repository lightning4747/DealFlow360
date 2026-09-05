# Team Collaboration & Branching Strategy — DealFlow360

> **Document ID:** DF360-STRAT-BRANCH  
> **Version:** 1.0.0  
> **Status:** APPROVED  
> **Audience:** Core Engineering Team

---

## 1. Objective & Philosophy

To deliver DealFlow360 with production enterprise quality, our engineering workflow follows a modern, trunk-oriented Git branching strategy adapted for multi-domain, cross-functional squads. 

Our core principles:
1. **Domain Isolation:** Infrastructure, Database, and Backend/Frontend feature developments happen on decoupled topic branches.
2. **Traceability:** Every pull request and commit is self-describing, atomic, and adheres strictly to Conventional Commits format.
3. **Continuous Integration:** No code merges into the mainline without automated test suites passing with 100% green status.
4. **Team Collaboration:** The repository history reflects distinct functional specializations working in tight synchronization.

---

## 2. Branch Topology & Hierarchy

```mermaid
gitgraph
   commit id: "init"
   branch develop
   checkout develop
   commit id: "baseline"
   
   branch infra/kong-gateway
   checkout infra/kong-gateway
   commit id: "fix: kong plugin"
   
   checkout develop
   branch db/schema-provision
   checkout db/schema-provision
   commit id: "feat: drizzle models"
   
   checkout develop
   branch feat/products-api
   checkout feat/products-api
   commit id: "feat: products crud"
   
   checkout develop
   merge infra/kong-gateway id: "merge infra"
   merge db/schema-provision id: "merge db"
   merge feat/products-api id: "merge feat"
   
   checkout main
   merge develop id: "release: v1.0.0" tag: "v1.0.0"
```

### 2.1 Branch Taxonomy

| Branch Type | Naming Convention | Primary Scope | Typical Target Branch |
|---|---|---|---|
| **Production** | `main` | Production-ready releases, immutable tags | Protected |
| **Integration** | `develop` | Shared integration baseline for ongoing deliverables | `main` |
| **Infrastructure** | `infra/<feature-slug>` | Docker, Kong Gateway, Kafka brokers, BullMQ queues, core mathematical engines | `develop` / `main` |
| **Database** | `db/<schema-slug>` | Drizzle ORM schemas, PostgreSQL migrations, spatial indexes, seed scripts | `develop` / `main` |
| **Feature / API** | `feat/<module-slug>` | NestJS controllers, services, guards, Next.js UI pages and components | `develop` / `main` |
| **Hotfix** | `fix/<issue-slug>` | Critical bug fixes, schema patch corrections, build breaks | `develop` / `main` |

---

## 3. Workstream Responsibilities

Our team divides technical ownership into three distinct, collaborative workstreams:

### 3.1 Infrastructure, Async Workers & Core Algorithmic Engines
- **Focus Areas:**
  - Multi-container orchestration, volume management, and service dependency health checks.
  - Declarative API Gateway routing, rate limiting policies, CORS, and request correlation IDs.
  - Kafka event producers/consumers and BullMQ background queue scheduling.
  - Complex algorithmic engines: Cost-Weighted Spatial Fulfillment Allocation (Phase 4), Order Bifurcation, Schedule Generation, and Mid-Cycle Proration (Phase 5).
- **Branch Prefix:** `infra/*`, `async/*`, `core/*`

### 3.2 Database Engineering & Persistence Layer
- **Focus Areas:**
  - Drizzle ORM schema topologies across the 5 logical domains (`sales`, `billing`, `fulfillment`, `analytics`, `portal`).
  - PostgreSQL extensions (`uuid-ossp`, `pgcrypto`, `postgis`, `timescaledb`).
  - Migration script generation, schema verification, and database rollback safety.
  - PostGIS spatial geometries, GIST indexing, and immutable audit triggers.
  - Deterministic database seed data and test fixtures.
- **Branch Prefix:** `db/*`

### 3.3 Backend Feature APIs & Web Workspaces
- **Focus Areas:**
  - NestJS domain modules, dependency injection, and REST controllers.
  - Zod validation pipes, standard `{ data, meta, error }` response envelopes, and error handling.
  - Role-based authorization guards, session validation, and customer magic link verification.
  - Next.js 14 App Router workspaces (Catalog, Tiers Matrix, Price Lists, Approver Dashboard).
  - Real-time Socket.IO collaboration and customer negotiation views.
- **Branch Prefix:** `feat/*`

---

## 4. Git Execution Protocols

### 4.1 Commit Message Standards
All commit messages must follow the Conventional Commits specification:
```
<type>(<scope>): <subject>
```

- **Allowed Types:**
  - `feat`: New user-facing feature or domain capability
  - `fix`: Bug fix or configuration correction
  - `refactor`: Code restructuring without behavioral change
  - `test`: Adding or correcting automated tests
  - `docs`: Documentation additions or updates
  - `chore`: Tooling, dependency updates, or workspace configuration
- **Scope Examples:** `api`, `database`, `infra`, `kong`, `web`, `auth`, `products`, `billing`, `fulfillment`.
- **Constraint:** Commit messages must remain modular and concise, describing the specific functional change without referencing phase identifiers.

### 4.2 PR & Integration Workflow
1. **Branch Checkout:** Create a topic branch from latest `main` (or `develop`):
   ```bash
   git checkout -b <prefix>/<feature-name>
   ```
2. **Modular Changes:** Make focused, atomic commits for each component.
3. **Local Quality Gate:** All automated tests and workspace builds must pass:
   ```bash
   pnpm test
   pnpm build
   ```
4. **Integration Merge:** Integrate the topic branch into the mainline with a clean commit history.

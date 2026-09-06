# DealFlow360

DealFlow360 is a enterprise-grade B2B quotation, governance, negotiation, fulfillment, and billing platform built on a modular monolith architecture.

---

## High-Level System Topology

```mermaid
graph TB
    subgraph CLIENTS["Client Layer"]
        SALES_FE["Sales Frontend\nNext.js / Shadcn UI / TanStack Query"]
        PORTAL_FE["Customer Portal\nNext.js / Magic Link Auth"]
    end

    subgraph GATEWAY["API Gateway — Kong (Port 8000 / 8443)"]
        KONG["Kong API Gateway\n─────────────────\nJWT Validation Plugin\nRate Limiting Plugin\nRequest ID Injection\nCORS Plugin\nProxy Cache Plugin"]
    end

    subgraph APP["Application Layer — NestJS Monolith (Port 3000)"]
        direction TB
        subgraph MODULES["NestJS Bounded Context Modules"]
            MOD_SALES["Sales Workspace Module"]
            MOD_GOV["Governance Engine Module"]
            MOD_FULFILL["Fulfillment Module"]
            MOD_BILLING["Billing Module"]
            MOD_PORTAL["Negotiation Portal Module"]
            MOD_ANALYTICS["Analytics Module"]
        end

        subgraph INFRA_MODULES["NestJS Infrastructure Modules"]
            MOD_AUTH["Auth Module (Better Auth)"]
            MOD_KAFKA["Kafka Module (KafkaJS)"]
            MOD_QUEUE["Queue Module (BullMQ)"]
            MOD_SEARCH["Search Module (Elasticsearch)"]
            MOD_REALTIME["Realtime Module (Socket.IO)"]
            MOD_DB["Database Module (Drizzle ORM)"]
        end
    end

    subgraph PERSISTENCE["Persistence Layer"]
        subgraph PG["PostgreSQL 16 Cluster"]
            PG_MAIN[("PostgreSQL 16\n──────────────\nsales schema\nbilling schema\nfulfillment schema\nanalytics schema\nportal schema")]
            PG_EXT["Extensions\n──────────\nTimescaleDB\nPostGIS\npg_trgm\nuuid-ossp"]
            PG_MAIN --- PG_EXT
        end
        REDIS[("Redis 7\n──────────\nBullMQ Queues\nSession Cache\nRate Limit Counters\nSocket.IO Adapter")]
        ES[("Elasticsearch 8\n──────────────\nQuote Full-Text\nAccount Search\nProduct Catalog\nAudit Log Index")]
    end

    subgraph MESSAGING["Async Messaging — Kafka (KRaft Mode)"]
        direction LR
        T1["quote.events"]
        T2["approval.events"]
        T3["fulfillment.events"]
        T4["billing.events"]
        T5["analytics.events"]
    end

    subgraph OBSERVABILITY["Observability Stack"]
        PROM["Prometheus"]
        GRAFANA["Grafana"]
        PROM --> GRAFANA
    end

    subgraph TOOLING["Dev Tooling"]
        KONG_MGR["Kong Manager (Port 8002)"]
        KAFKA_UI["Kafka UI (Port 8080)"]
        BULL_BOARD["Bull Board (Port 3004)"]
    end

    SALES_FE -->|"HTTPS + WSS"| KONG
    PORTAL_FE -->|"HTTPS + WSS"| KONG
    KONG -->|"HTTP (internal)"| APP
    APP -->|"Drizzle ORM"| PG_MAIN
    APP -->|"ioredis"| REDIS
    APP -->|"@elastic/elasticsearch"| ES
    APP -->|"KafkaJS produce"| MESSAGING
    MESSAGING -->|"KafkaJS consume"| APP
    APP -->|"metrics scrape endpoint"| PROM
```

---

## Service Context Boundaries

```mermaid
graph LR
    subgraph INTERNAL["NestJS Application Boundary"]
        SALES["Sales\nWorkspace"]
        GOV["Governance\nEngine"]
        FULFILL["Fulfillment"]
        BILLING["Billing"]
        PORTAL["Negotiation\nPortal"]
        ANALYTICS["Analytics &\nObservability"]
    end

    SALES -- "quote.events.submitted" --> GOV
    GOV -- "approval.events.approved" --> SALES
    GOV -- "approval.events.rejected" --> SALES
    GOV -- "approval.events.approved" --> FULFILL
    GOV -- "approval.events.approved" --> PORTAL
    FULFILL -- "fulfillment.events.shipped" --> BILLING
    FULFILL -- "fulfillment.events.delivered" --> BILLING
    FULFILL -- "fulfillment.events.*" --> ANALYTICS
    BILLING -- "billing.events.invoiced" --> ANALYTICS
    BILLING -- "billing.events.paid" --> ANALYTICS
    PORTAL -- "approval.events.counterproposal" --> GOV
    PORTAL -- "approval.events.accepted" --> GOV
    SALES -- "analytics.events.quote_created" --> ANALYTICS
```

---

## Database Schema Topology

```mermaid
graph TB
    subgraph PG["PostgreSQL 16 — dealflow360 database"]
        subgraph SALES_S["sales schema"]
            ACCOUNTS["accounts"]
            CONTACTS["contacts"]
            OPPORTUNITIES["opportunities"]
            QUOTES["quotes"]
            QUOTE_LINES["quote_line_items"]
            PRODUCTS["products"]
            PRICING_RULES["pricing_rules"]
            QUOTE_ACTIVITY["quote_activity"]
            APPROVAL_WF["approval_workflows"]
            APPROVAL_STAGES["workflow_stages"]
            APPROVAL_RULES["approval_rules"]
            APPROVAL_REQS["approval_requests"]
            APPROVAL_DECISIONS["approval_decisions"]
        end

        subgraph FULFILL_S["fulfillment schema"]
            ORDERS["orders"]
            ORDER_LINES["order_line_items"]
            SHIPMENTS["shipments"]
            WAREHOUSES["warehouse_locations — PostGIS POINT"]
            INV_LEDGER["inventory_ledger — TimescaleDB Hypertable"]
        end

        subgraph BILLING_S["billing schema"]
            INVOICES["invoices"]
            INVOICE_LINES["invoice_line_items"]
            PAYMENTS["payments"]
            CREDIT_MEMOS["credit_memos"]
            SUBSCRIPTIONS["subscriptions"]
            REV_ENTRIES["revenue_entries — TimescaleDB Hypertable"]
        end

        subgraph ANALYTICS_S["analytics schema"]
            PIPELINE_SNAPS["pipeline_snapshots — TimescaleDB Hypertable"]
            QUOTE_METRICS["quote_metrics"]
            REVENUE_TS["revenue_ts — TimescaleDB Hypertable"]
            REP_LEADERBOARD["rep_leaderboard"]
            EVENT_LOG["event_log"]
        end

        subgraph PORTAL_S["portal schema"]
            ML_TOKENS["magic_link_tokens"]
            PORTAL_SESSIONS["portal_sessions"]
            NEG_THREADS["negotiation_threads"]
            NEG_COMMENTS["negotiation_comments"]
            COUNTER_PROPS["counter_proposals"]
            SIGNATURES["signatures"]
            YJS_DOCS["yjs_documents"]
        end
    end
```

---

## End-to-End Deal Lifecycle Sequence

```mermaid
sequenceDiagram
    autonumber
    actor Rep as Sales Rep
    actor Customer as Customer
    participant FE as Next.js Sales App
    participant Kong as Kong Gateway
    participant App as NestJS App
    participant DB as PostgreSQL
    participant Kafka as Kafka
    participant Queue as BullMQ / Redis
    participant ES as Elasticsearch
    participant Portal as Customer Portal

    Rep->>FE: Opens opportunity, clicks "New Quote"
    FE->>Kong: POST /api/quotes (JWT in cookie)
    Kong->>Kong: Validate JWT, inject X-Correlation-ID, X-User-ID
    Kong->>App: Proxy request
    App->>DB: INSERT sales.quotes (status=DRAFT)
    App->>DB: INSERT sales.quote_line_items[]
    App->>ES: Index quote document (async)
    App->>Kafka: Produce quote.events [quote.created]
    App-->>FE: 201 { quoteId }

    Note over FE,App: Socket.IO room: quote:{quoteId} — Yjs CRDT delta sync on each keystroke

    Rep->>FE: Clicks "Submit for Approval"
    FE->>Kong: PATCH /api/quotes/{id}/submit
    Kong->>App: Proxy
    App->>DB: UPDATE sales.quotes SET status=PENDING_APPROVAL
    App->>Kafka: Produce quote.events [quote.submitted]
    App-->>FE: 200 OK

    App->>App: Governance Consumer receives quote.submitted
    App->>DB: Evaluate approval_rules, match workflow
    App->>DB: INSERT sales.approval_requests + workflow_stages
    App->>Queue: Enqueue approval:notification (approver email)
    App->>Queue: Enqueue approval:sla-timer (delay = SLA minutes)
    App->>Kafka: Produce approval.events [approval.initiated]

    App->>App: Approver clicks approve in Sales App
    FE->>Kong: POST /api/approvals/{id}/decide { decision: APPROVED }
    Kong->>App: Proxy
    App->>DB: INSERT sales.approval_decisions
    App->>DB: UPDATE sales.approval_requests SET status=APPROVED
    App->>Kafka: Produce approval.events [approval.approved]
    App->>Queue: Cancel sla-timer job

    App->>App: Portal consumer receives approval.approved
    App->>Queue: Enqueue portal:magic-link (customer email)
    Queue->>Customer: Magic link email: "Review your quote"

    Customer->>Portal: Clicks magic link
    Portal->>Kong: GET /portal/auth/verify?token=...
    Kong->>App: Proxy
    App->>DB: Validate magic_link_tokens, INSERT portal_sessions
    App-->>Portal: Set session cookie, redirect to quote view

    Customer->>Portal: Reviews quote, submits counter-proposal
    Portal->>Kong: POST /portal/quotes/{id}/counter
    Kong->>App: Proxy
    App->>DB: INSERT portal.counter_proposals
    App->>Kafka: Produce approval.events [approval.counterproposal]

    App->>App: Governance consumer receives counterproposal
    App->>DB: Open new review stage for counter
    Note over App: Rep reviews, accepts customer terms

    Customer->>Portal: Clicks "Accept and Sign"
    Portal->>Kong: POST /portal/quotes/{id}/sign
    Kong->>App: Proxy
    App->>DB: INSERT portal.signatures
    App->>Kafka: Produce approval.events [approval.accepted]

    App->>App: Fulfillment consumer receives approval.approved/accepted
    App->>DB: INSERT fulfillment.orders
    App->>DB: PostGIS KNN — SELECT nearest warehouse with stock
    App->>DB: INSERT fulfillment.inventory_ledger (movement = -qty)
    App->>Kafka: Produce fulfillment.events [order.created, order.allocated]

    Note over App: Carrier webhook arrives with delivery confirmation
    App->>DB: INSERT fulfillment.shipments
    App->>Kafka: Produce fulfillment.events [shipment.dispatched]
    App->>Kafka: Produce fulfillment.events [shipment.delivered]

    App->>App: Billing consumer receives shipment.delivered
    App->>DB: INSERT billing.invoices + billing.invoice_line_items
    App->>Queue: Enqueue billing:invoice-pdf
    Queue->>Customer: Invoice email with PDF attachment
    App->>Kafka: Produce billing.events [invoice.created]

    Note over Customer,App: Customer pays online
    App->>DB: INSERT billing.payments
    App->>DB: UPDATE billing.invoices SET status=PAID
    App->>Kafka: Produce billing.events [invoice.paid]

    App->>App: Analytics consumers receive all domain events
    App->>DB: INSERT/UPDATE analytics.quote_metrics, revenue_ts, pipeline_snapshots
    Note over App,DB: TimescaleDB continuous aggregates roll up automatically
```

---

## Technology Stack

- **Backend Framework:** NestJS (Node.js/TypeScript monorepo)
- **Frontend Applications:** Next.js App Router, Tailwind CSS, Shadcn UI, TanStack Query
- **Database & Extensions:** PostgreSQL 16 (TimescaleDB, PostGIS, `pg_trgm`, `uuid-ossp`)
- **ORM & Migrations:** Drizzle ORM
- **Async Event Messaging:** Apache Kafka (KRaft mode)
- **Queue Engine:** BullMQ + Redis 7
- **Full-Text & Faceted Search:** Elasticsearch 8
- **API Gateway:** Kong API Gateway
- **Real-time Collaboration:** Socket.IO & Yjs CRDTs
- **Observability:** Prometheus & Grafana

---

## Directory Structure

```
.
├── apps/
│   ├── api/          # NestJS backend application
│   └── web/          # Next.js web client application (Sales workspace & Portal)
├── docs/             # Technical specifications & architecture guides
├── infra/            # Docker Compose & gateway configurations
└── packages/         # Shared internal libraries and packages
```

---

## Ports and Endpoints

| Component | Port | Purpose |
|---|---|---|
| Kong Ingress Proxy | `8000` / `8443` | Primary API Ingress |
| Kong Admin API | `8001` | Gateway Configuration API |
| Kong Manager | `8002` | Gateway Admin UI |
| NestJS Application | `3000` | Core API Application |
| Next.js Frontend | `3001` | Web Client |
| PostgreSQL | `5432` | Primary Relational Store |
| Redis | `6379` | Queue Broker and Cache |
| Kafka Broker | `9092` | Event Streaming Broker |
| Kafka UI | `8080` | Cluster Operations Console |
| Elasticsearch | `9200` | Search Engine REST API |
| Prometheus | `9090` | Metrics Collector |
| Grafana | `3003` | Metrics & Dashboards UI |
| Bull Board | `3004` | Task Queue Monitoring Console |

---

## Getting Started

### Prerequisites

- Node.js >= 20.x
- pnpm >= 9.x
- Docker & Docker Compose

### Installation and Run

1. Clone the repository and install dependencies:
   ```bash
   pnpm install
   ```

2. Start infrastructure backing services:
   ```bash
   docker compose up -d
   ```

3. Run database migrations:
   ```bash
   pnpm --filter api db:migrate
   ```

4. Start development services:
   ```bash
   pnpm dev
   ```

---

## Testing

Run tests across services:

```bash
# Run unit and integration tests for API
pnpm --filter api test

# Run e2e lifecycle test suite
pnpm test:e2e
```

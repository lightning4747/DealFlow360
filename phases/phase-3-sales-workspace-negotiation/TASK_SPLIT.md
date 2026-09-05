# Task Breakdown & Delivery Matrix — Sales Workspace & Customer Negotiation Portal

> **Status:** Pending Execution  
> **Phase Scope:** Interactive Quote Builder, Margin Modeling, Upsell Recommendations, Magic Link Customer Negotiation Portal, Real-Time Socket.IO Redlining

---

## 1. Task Distribution Matrix

| Workstream | Domain | Key Responsibilities | Deliverables | Status |
|---|---|---|---|:---:|
| **Database** | Persistence & History | Customer negotiation session schema, line comments, redline diff history | Drizzle schemas for `portal.quote_sessions`, `sales.quote_comments` | ⏳ Pending |
| **Backend** | Real-Time & Calculation | Margin modeling engine, Upsell/Cross-Sell rules, Negotiation API, Socket.IO gateway | `SalesWorkspaceModule`, `NegotiationGateway`, `UpsellEngineService` | ⏳ Pending |
| **Infrastructure** | WebSocket Gateway & Cache | Socket.IO gateway ingress, Redis adapter for clustering, session TTL eviction | Kong WS routing, Redis socket adapter configuration | ⏳ Pending |
| **Frontend** | Workspace & Portal UI | Interactive Quote Builder with live margin gauges, External Customer Portal | `apps/web/app/quotes/*`, `apps/web/app/portal/*` | ⏳ Pending |

---

## 2. Granular Task Breakdown

### 2.1 Database (DB)
- [ ] Implement `portal.quote_sessions` tracking active customer magic link sessions, client IP, and last heartbeat.
- [ ] Implement `sales.quote_comments` enabling line-item redlining and collaborative commentary.
- [ ] Implement `sales.quote_versions` for tracking immutable deal revisions across counter-offer rounds.
- [ ] Write database migration and rollback SQL for negotiation tables.

### 2.2 Backend (API, WebSocket & Business Logic)
- [ ] Implement live Quote Margin Modeling service calculating Net Margin, Gross Margin, and Discount Roll-ups per line and overall quote.
- [ ] Implement rule-based Upsell/Cross-Sell recommendation engine suggesting complementary hardware or support tiers.
- [ ] Implement `NegotiationGateway` using NestJS WebSockets / Socket.IO:
  - Broadcast room events: `line:discount_proposed`, `line:comment_added`, `quote:confirmed`.
  - Re-evaluate BRS automatically when customer counter-offer modifies discounts.
- [ ] Implement Customer Negotiation API endpoints (`GET /api/v1/portal/quotes/:id`, `POST /counter`, `POST /confirm`).

### 2.3 Infrastructure & Real-Time Sync (Infra)
- [ ] Configure Kong API Gateway for WebSocket upgrade forwarding to NestJS Socket.IO port.
- [ ] Set up `@socket.io/redis-adapter` backed by Redis 7.2 cluster to guarantee room synchronization across multiple backend instances.
- [ ] Configure ephemeral negotiation presence caching in Redis (`presence:<quoteId>:<userId>`).
- [ ] Configure rate-limiting rules for portal counter-offer submission (max 5 counter submissions per hour).

# Task Breakdown & Delivery Matrix — Governance & Approval Engine

> **Status:** Pending Execution  
> **Phase Scope:** Blended Risk Score (BRS) Engine, Multi-Tier Dynamic Approval State Machine, Kafka Event Streams, BullMQ Queues, and Approver Dashboard

---

## 1. Task Distribution Matrix

| Workstream | Domain | Key Responsibilities | Deliverables | Status |
|---|---|---|---|:---:|
| **Database** | Persistence & Audit | Discount ceilings schema, approval workflow tables, audit immutability triggers | `0001_governance_and_approvals.sql`, Drizzle schema updates | ⏳ Pending |
| **Backend** | Core Calculation & API | BRS calculation service, state machine transitions, approval decision endpoints | `GovernanceModule`, `BrsCalculationService`, `ApprovalRoutingService` | ⏳ Pending |
| **Infrastructure** | Async Messaging & Queues | Kafka event publishing (`quote.events`, `approval.events`), BullMQ job queues and workers | Kafka producers/consumers, BullMQ `approval-routing` & `email-notifications` | ⏳ Pending |
| **Frontend** | Approver Workspace | Next.js Approver Dashboard with deal risk badges and one-click approve/reject actions | `apps/web/app/approvals/*` | ⏳ Pending |

---

## 2. Granular Task Breakdown

### 2.1 Database (DB)
- [ ] Implement table `sales.discount_ceilings` mapping `tier_id` and `category` to `max_discount_pct`.
- [ ] Implement approval tracking tables:
  - `sales.approvals`: Root record tracking `quote_id`, `brs_score`, `approval_level` (`level_1`, `level_2`, `level_3`), and status.
  - `sales.approval_steps`: Sequential step tracking (`step_order`, `role_required`, `assigned_user_id`, `decision`, `decision_reason`).
- [ ] Enforce append-only immutability trigger on `sales.audit_logs` preventing `UPDATE` and `DELETE` operations.
- [ ] Export typed Drizzle schema definitions and Zod validation contracts.

### 2.2 Backend (API & Governance Engine)
- [ ] Implement `BrsCalculationService`:
  - Per-line violation formula: $\text{lineViolation}_i = \max\left(0, \frac{\text{appliedDiscount}_i - \text{tierCeiling}_i}{\text{tierCeiling}_i} \times 100\right)$
  - Revenue order weighting: $\text{lineWeight}_i = \frac{\text{lineTotal}_i}{\text{orderTotal}}$
  - Aggregate Blended Risk Score: $\text{BRS} = \sum (\text{lineViolation}_i \times \text{lineWeight}_i)$
  - Dynamic routing mapping:
    - $\text{BRS} = 0 \implies \text{Auto-Approve (Sent)}$
    - $1 \le \text{BRS} \le 25 \implies \text{Level 1 (Sales Manager)}$
    - $26 \le \text{BRS} \le 50 \implies \text{Level 2 (Sales Manager } \rightarrow \text{ Finance)}$
    - $\text{BRS} > 50 \implies \text{Level 3 (Manager } \rightarrow \text{ Finance + Admin Alert)}$
- [ ] Implement `ApprovalRoutingService`:
  - Evaluate quote submission guards (minimum 1 line, positive prices, valid customer account, valid expiry).
  - Transition state from `draft` to `pending_approval` or `sent`.
  - Process approver decisions (`POST /api/v1/sales/quotes/:id/approve` and `reject`).
- [ ] Implement unit test suite verifying mathematical BRS edge cases, zero denominators, and rounding precision.

### 2.3 Infrastructure & Async Event Streaming (Infra)
- [ ] Integrate Kafka producer in NestJS to emit `quote.events` (`quote.submitted`, `quote.approved`, `quote.rejected`).
- [ ] Build Kafka consumer microservice listening to `quote.events` and dispatching downstream queue tasks.
- [ ] Implement BullMQ job queue `approval-routing`:
  - Concurrency management and exponential backoff retry policies.
  - Escalation timers when approvals exceed SLA (24 hours).
- [ ] Implement BullMQ queue `email-notifications` for asynchronous approver dispatch.
- [ ] Dead-letter queue (DLQ) configuration for failed delivery attempts.

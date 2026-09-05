# Task Breakdown & Delivery Matrix — Hybrid Billing & Subscription Management Engine

> **Status:** Pending Execution  
> **Phase Scope:** Order Bifurcation Split Engine, Forward Billing Schedule Generator, Mid-Cycle Proration Engine, Credit Notes & Invoice Voiding, Billing Management UI

---

## 1. Task Distribution Matrix

| Workstream | Domain | Key Responsibilities | Deliverables | Status |
|---|---|---|---|:---:|
| **Database** | Financial Persistence | Subscriptions, billing schedules, invoices, credit notes schemas & constraints | `0004_hybrid_billing.sql`, Drizzle models | ⏳ Pending |
| **Backend** | Financial Operations & API | Invoicing service, subscription cancellation API, credit note issuance | `BillingModule`, `InvoiceService`, `SubscriptionService` | ⏳ Pending |
| **Infrastructure** | Financial Logic Engines | Order Bifurcation Split Engine, Forward Billing Generator, Mathematical Proration | `BifurcationEngine`, `ProrationEngine`, BullMQ `billing-generation` | ⏳ Pending |
| **Frontend** | Billing Dashboard | Next.js Billing & Subscriptions console, invoice PDF preview, credit note drawer | `apps/web/app/billing/*` | ⏳ Pending |

---

## 2. Granular Task Breakdown

### 2.1 Database (DB)
- [ ] Implement `billing.subscriptions` with fields `customer_id`, `quote_line_id`, `plan_name`, `cadence` (`monthly`, `quarterly`, `annual`), `monthly_amount`, `current_period_start`, `current_period_end`.
- [ ] Implement `billing.billing_schedules` pre-generating 12-month installment records with status (`scheduled`, `invoiced`, `skipped`).
- [ ] Implement `billing.invoices` and `billing.credit_notes` with unique sequential numbering and foreign keys to `quotes` and `customers`.
- [ ] Define database check constraints preventing negative invoice balances and ensuring immutable invoice states once paid or voided.

### 2.2 Backend (Financial Services & Lifecycle)
- [ ] Implement `InvoiceService`:
  - Fetch due billing schedules.
  - Emit invoice documents and link generated IDs to confirmed deals.
- [ ] Implement `SubscriptionService`:
  - Handle seat adjustments, mid-cycle tier upgrades, cancellations at period end, and immediate terminations.
- [ ] Implement Credit Note generation with required audit reason code and authorization controls.

### 2.3 Infrastructure & Financial Logic Core (Infra)
- [ ] Implement **Order Bifurcation Split Engine**:
  - Atomically parse confirmed quotes into:
    1. Immediate one-time upfront invoices (Hardware + Professional Services).
    2. Active recurring subscription records (SaaS software licenses).
  - Execute within a single database transaction boundary.
- [ ] Implement **Forward Billing Schedule Generator**:
  - Pre-generate future billing dates respecting leap years, month-end date offsets (e.g. Feb 28/29), and cadence multipliers.
- [ ] Implement **Mathematical Proration Engine**:
  - Exact daily proration calculation:
    $$\text{Proration} = \frac{\text{Remaining Days in Period}}{\text{Total Days in Period}} \times (\text{New Price} - \text{Old Price})$$
  - Enforce financial rounding rules to 2 decimal places.
- [ ] Implement BullMQ asynchronous worker `billing-generation` for automated cron-based invoice dispatch.

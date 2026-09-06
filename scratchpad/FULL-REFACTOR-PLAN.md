# DealFlow360 Full-Scale Refactor Plan

## Objective

Bring the implementation into full alignment with `docs/FUNCTIONAL_REQUIREMENTS.md` by making authorization, domain state, API contracts, persisted data, and frontend behavior share one backend-authoritative model.

This is a staged refactor, not a rewrite. Existing working modules remain in place while invariants move into centralized policies and domain services.

## Requirements and policy decisions

- Sales representatives create, edit, calculate, and submit quotations.
- Sales managers and finance users approve the approval steps assigned to their roles.
- Administrators configure catalog, pricing, approval workflows, warehouses, subscription plans, and platform analytics; they do not approve or reject quotations unless the FRD is formally changed.
- Customers can only access their own quote/account through a verified, signed portal session.
- All financial totals, discounts, approval transitions, fulfillment state, subscription state, and payment state are server-authoritative.

## Validation tracks

### Requirements alignment

- Map FR-01–FR-52 and all NFRs to routes, guards, services, database tables, frontend screens, and acceptance tests.
- Maintain a role/resource/action matrix for admin, sales rep, sales manager, finance, and customer.
- Reject any UI action or endpoint not justified by the matrix.

### Authentication, RBAC, and isolation

- Centralize resource/action policies and remove administrator approval bypasses.
- Enforce actor ownership and customer/account scope on quote, approval, invoice, subscription, fulfillment, analytics, and audit reads.
- Add access-token refresh, logout, expiry, and revoked-session tests.
- Test cross-role and cross-customer access at HTTP and service boundaries.

### Domain and semantic correctness

- Define quote states: `draft`, `pending_approval`, `sent`, `under_negotiation`, `rejected`/`returned`, `confirmed`, `fulfilled`, `cancelled`.
- Define approval states: `pending`, `approved`, `rejected`, `returned`, `superseded`.
- Make every transition atomic, audited, and guarded by compare-and-set conditions.
- Add immutable quote revision/proposal records. Approval, portal negotiation, and confirmation must reference an exact revision.
- Ensure rejection followed by revision creates a new approval identity instead of reviving old workflow rows.

### API contract consistency

- Inventory every frontend request through controller, guard, service, database, and response shape.
- Select canonical routes and retire or document aliases.
- Standardize response envelopes, pagination, statuses, error codes, and shared types.
- Provide one canonical pending-approval contract for dashboard and approvals.

### Customer portal

- Remove hardcoded customer emails, participant names, quote IDs, and Acme fallback identity.
- Derive all display and mutation identity from the verified portal session.
- Bind sessions to customer/account and quote revision; reject replay and cross-customer use.
- Persist negotiation messages with author and timestamp.

### Fulfillment and inventory

- Verify warehouse allocation, reservation, split, shortage, backorder, and completion transitions against persisted stock.
- Make fulfillment commands idempotent and transactionally tied to quote/order state.
- Test concurrent reservation and insufficient-stock behavior.

### Billing, subscriptions, payments, and documents

- Enforce invoice/subscription ownership and valid state transitions.
- Add durable webhook receipt/event deduplication and reconciliation.
- Generate and download a real authenticated invoice PDF from persisted invoice data; never report success via an alert.
- Validate amount, currency, gateway transaction identity, and duplicate callbacks.

### Frontend backend-only behavior

- Remove fixed records, fallback arrays, fabricated counts, client-side financial calculations, default identities, fake success, alerts, and stale optimistic state.
- Render loading/error/empty states from API responses.
- Refresh authoritative state after commands.
- Render actions only when role and current server state allow them.

### Database and seed integrity

- Add constraints, indexes, foreign keys, and transaction boundaries for ownership, statuses, money, and unique gateway events.
- Replace implicit schema repair with versioned, observable migrations over time.
- Separate reference data from scenario fixtures.
- Seed draft, manager-pending, finance-pending, rejected, returned, negotiating, confirmed, invoice, subscription, fulfillment, backorder, and multiple-customer isolation scenarios.
- Use stable keys and never reset a business workflow to `draft` on ordinary seed reruns.

### Observability and testing

- Audit actor, role, scope, resource, prior state, next state, correlation ID, and request ID on all commands.
- Add metrics and safe error reporting for authorization failures, stale commands, duplicate events, reconciliation failures, and PDF failures.
- Add unit, PostgreSQL integration, concurrency, browser, and full FRD acceptance tests.

## Dependency-aware execution phases

1. **Baseline:** capture live responses/database state, build the contract matrix, and define deterministic fixture verification.
2. **Authorization:** implement centralized RBAC, ownership, customer isolation, and session lifecycle.
3. **Workflow:** implement approval/quote state machines, atomic transitions, audit events, and immutable revisions.
4. **Contracts:** normalize routes, envelopes, typed clients, cache behavior, and status vocabulary.
5. **Portal:** remove hardcoded identity and bind negotiation/confirmation to verified sessions and revisions.
6. **Fulfillment:** verify inventory allocation, reservations, splits, backorders, and idempotent commands.
7. **Billing:** implement PDF delivery, invoice transitions, subscription lifecycle, webhook receipts, and reconciliation.
8. **Frontend:** remove all false-success/mock behavior and connect every action to persisted API state.
9. **Fixtures:** build safe, repeatable end-to-end scenarios for every role and workflow branch.
10. **Verification:** run builds, role matrices, isolation tests, concurrency tests, browser flows, and FRD acceptance checks.

## Completion criteria

- Admin cannot list actionable approvals or approve/reject quotations.
- Dashboard and approvals show the same server-authoritative pending set.
- Rejected approvals remain rejected until an explicit new revision is submitted.
- Quote and invoice data are scoped to the authorized actor/customer.
- Portal identity never defaults to `procurement@acme.com` or another account.
- Invoice download returns a PDF response.
- No frontend business record or success state is fabricated.
- Seed reruns preserve existing workflow decisions.
- The complete FRD acceptance flow passes for every relevant role.

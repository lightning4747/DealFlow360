# DealFlow360 Architecture and Code-Quality Audit

Audit scope: frontend, API, domain services, database schema/migrations, authentication/RBAC, quotation governance, portal negotiation, fulfillment, billing, subscriptions, payments, analytics, integrations, tests, observability, and frontend/backend contract consistency.

Requirements source:  docs/FUNCTIONAL_REQUIREMENTS.md .

Overall assessment: DealFlow360 is a partially wired prototype with several live backend paths, but it is not currently safe to treat as a production quotation-to-cash system. The most serious problems are unauthorized data access, client-controlled financial values, insecure customer portal operations, inconsistent workflow state transitions, and frontend behavior that reports success without confirmed backend persistence.

No repository code was changed during this audit.

────────────────────

## Executive risk summary

| Priority | Count | Summary |
|----------|-------|---------|
| P0       |     8 | Security, financial integrity, or irreversible state risks |
| P1       |    16 | Major broken workflows and architectural defects |
| P2       |    12 | Significant correctness, maintainability, and completeness issues |
| P3       |     8 | Cleanup, UX, duplication, and lower-risk technical debt |

The highest-risk defects must be fixed before adding more features:

1. Remove authentication bypasses and secure portal access.
2. Enforce quote ownership/customer isolation server-side.
3. Stop trusting client-provided prices, costs, totals, and discount-derived values.
4. Introduce authoritative quote and approval state transitions.
5. Replace fake frontend success/fallback states with persisted API results.
6. Add transaction, idempotency, concurrency, and end-to-end workflow tests.

────────────────────

## 1. Reality Map

### A. Working or substantially working

| Area                  | Reality |
|-----------------------|---------|
| Internal password     | Live database lookup and bcrypt verification exist in AuthService. |
| login                 |         |
| JWT issuance          | Access and refresh JWTs are generated, although refresh lifecycle is incomplete. |
| Basic RBAC mechanism  | JwtAuthGuard, RolesGuard, and @Roles() exist. |
| Product read API      | Product listing and detail APIs are live. |
| Quote creation        | Sales reps can create quote and quote-line rows. |
| persistence           |         |
| Basic quote           | Server-side quote/BRS calculation exists. |
| calculation           |         |
| Approval step         | Approval and approval-step records are created transactionally in the normal submission path. |
| persistence           |         |
| Stock reservation     | Reservation uses row locking and transactions in StockReservationService. |
| primitive             |         |
| Invoice/subscription  | Confirmation creates one-time invoices and recurring subscriptions inside a transaction. |
| bifurcation           |         |
| Subscription          | Quantity modification and credit/invoice generation logic exists. |
| proration engine      |         |
| Invoice               | Backend and frontend paths exist, subject to authorization and state-integrity issues. |
| listing/detail/void   |         |
| Magic-link single-use | verifyMagicLink() marks the database record as used. The portal APIs do not consistently enforce that state. |
| verification endpoint |         |
| Unit-level backend    | There are tests for auth, governance, billing, fulfillment, anomaly detection, portal, DTO validation, and health. |
| tests                 |         |

### B. Partially implemented

| Area            | Reality |
|-----------------|---------|
| Quotation       | Uses live APIs but has incorrect client fallback calculations and can hide failed submission. |
| builder         |         |
| Approval queue  | Calls a live API but starts from hardcoded rows, maps the wrong response fields, and optimistically reports failed decisions as successful. |
| Customer portal | Token-based view exists, but quote-ID routes bypass authentication and ownership checks. |
| Billing         | Backend billing services are more complete than the UI; payment and confirmation flows are not connected end to end. |
| Subscriptions   | Listing, preview, quantity modification, and cancellation exist, but role contracts and state validation are inconsistent. |
| Analytics       | Backend services exist, but route configuration and data sources are inconsistent with the frontend. |
| Recommendations | Database/service support exists, but admin configuration and robust error semantics are incomplete. |
| Authentication  | Login works, but signup role behavior, access-token refresh, route protection, and development bypasses are unsafe. |

### C. Frontend-only or mocked

• Dashboard metrics and recent activity:  apps/web/app/page.tsx .
• Fulfillment page:  apps/web/app/fulfillment/page.tsx .
• Approval fallback rows:  apps/web/app/approvals/page.tsx .
• Product fallback catalog and summary counts:  apps/web/app/products/page.tsx .
• Report fallback metrics and export controls:  apps/web/app/reports/page.tsx .
• Portal comments, presence, and demo participant identity:  apps/web/app/portal/quotes/[token]/page.tsx .
• Invoice PDF download: browser alert only.
• Deal-health nudge: local React state only.
• Several “offline mode” success messages.

### D. Backend-only or not wired to the UI

• Payment processing:  apps/api/src/modules/payments/payments.controller.ts .
• Customer payment flow.
• Most product/variant/price-list administration.
• Discount ceiling and approval-chain administration.
• Warehouse CRUD and replenishment configuration.
• Subscription-plan and proration-rule configuration.
• Audit-log presentation.
• Actual report filters and exports.
• Fulfillment actions and backorder consolidation.
• Persistent nudge/escalation behavior.

### E. Exists but is semantically incorrect

• Client-provided  unitPrice  and  unitCost  are persisted into quotes.
• Customer counter-discounts mutate quote totals directly without recalculating line totals or creating an immutable revision.
• Portal quote-ID operations are public.
• Approval decisions are not concurrency-safe.
• A quote can be edited while it is under approval.
• Frontend can claim approval, counter-proposal, confirmation, or nudge success after failed requests.
• Analytics uses inconsistent schema/table names and route prefixes.
• Billing state fields are frequently unconstrained strings rather than domain-enforced transitions.

### F. Missing

• Reliable tenant model and tenant isolation.
• Server-side ownership policies for quote, invoice, subscription, fulfillment, and customer resources.
• Complete customer authentication/session model.
• A formal quote/approval/order state machine.
• End-to-end persisted fulfillment UI.
• End-to-end payment UI and payment-state reconciliation.
• Idempotent payment/event processing.
• Real admin configuration surfaces.
• Required reporting filters and PDF/XLS exports.
• Comprehensive integration and browser tests.

────────────────────

## 2. P0 — Fundamentally incorrect, security-sensitive, or financial-integrity defects

### P0-1 — Authentication bypass through default login credentials

Severity: P0
Files:  apps/api/src/modules/auth/auth.controller.ts:10-21

Actual behavior

The login controller applies defaults when fields are absent:

const email = body?.email || 'manager@dealflow360.com';
const password = body?.password || 'password123';

The GET login endpoint also logs in as the manager account without user-supplied credentials.

Expected behavior

FR-01 and NFR-03 require secure authentication. Missing credentials must be rejected, not replaced with a privileged account.

Impact

An empty login request can become an authenticated internal session. This is a direct authentication bypass.

Correction

• Remove the GET login endpoint.
• Require the validated login DTO directly.
• Reject missing or malformed credentials.
• Remove demo credentials from production code and seed them only in explicit development fixtures.

Dependencies

Requires coordinated changes to login UI, tests, seed data, and deployment configuration.

────────────────────

### P0-2 — Development JWT fallback grants administrator access

Severity: P0
Files:  apps/api/src/modules/auth/guards/jwt-auth.guard.ts:25-44

Actual behavior

When no token is supplied outside production, the guard assigns:

role: 'admin'

to the request.

Expected behavior

Authentication and RBAC must be enforced consistently in every environment. Development conveniences must not silently change authorization semantics.

Impact

Any unauthenticated request in a non-production environment becomes an administrator request. This masks authorization defects and makes staging behavior materially different from production.

Correction

• Remove the implicit admin request user.
• Use explicit test fixtures or a clearly isolated development authentication provider.
• Add tests proving anonymous requests are rejected for protected endpoints in all environments.

Dependencies

Requires local development login/seed setup and test harness changes.

### Remediation status — P0-1 and P0-2

Completed in the authentication-hardening remediation commit:

- `POST /auth/login` now validates the submitted body directly and no longer substitutes privileged default credentials.
- The unauthenticated GET login helper was removed.
- Protected API requests now return `401 UNAUTHORIZED` without a bearer token in every environment; the development administrator fallback was removed.

Remaining dependency: add explicit auth integration tests for missing credentials, removed GET login, and anonymous protected-route rejection.

────────────────────

### P0-3 — Public portal quote-ID routes permit unauthorized access and mutation

Severity: P0
Files:
 apps/api/src/modules/portal/portal.controller.ts:33-60
 apps/api/src/modules/portal/portal.service.ts:283-358

Actual behavior

The following routes are public:

•  GET /portal/quotes/:id
•  POST /portal/quotes/:id/counter
•  POST /portal/quotes/:id/confirm

They accept a quote ID and do not require a valid portal token, customer session, or customer identity.

Expected behavior

FR-36 and NFR-03 require authenticated customer-only access and customer-data isolation.

Impact

Anyone who obtains or guesses a quote ID can read quote data, submit a counter-discount, or confirm the quote.

Correction

• Remove public quote-ID operations.
• Require a signed portal session or one-time token on every portal operation.
• Bind the token to both quote ID and customer ID/email.
• Enforce allowed quote statuses and customer ownership server-side.

Dependencies

Requires a defined portal session model, token lifecycle, frontend contract changes, and migration support for session ownership.

### Remediation status — P0-3

Completed in the portal access-hardening remediation commit:

- Removed quote-ID view, counter, and confirmation routes.
- Removed email-only customer quote listing.
- Kept portal operations on the magic-link token endpoints, where the quote is resolved from the token hash rather than a caller-supplied quote ID.

Remaining dependency: complete the signed portal-session exchange and bind the session to the quote and customer identity before treating portal authentication as complete.

────────────────────

### P0-4 — Magic-link portal APIs do not enforce single-use state

Severity: P0
Files:  apps/api/src/modules/portal/portal.service.ts:20-39, 112-130

Actual behavior

 verifyMagicLink()  checks and marks  usedAt , but portal operations validate only token hash and expiry. They do not reject a token whose  usedAt  is already populated.

Expected behavior

FR-02 requires secure customer authentication. A single-use magic link must not remain usable for arbitrary portal actions after consumption.

Impact

A leaked token can remain usable for viewing, negotiation, and confirmation until expiry.

Correction

• Require  usedAt IS NULL  for initial consumption.
• Exchange the magic link for a short-lived portal session.
• Use the portal session for subsequent operations.
• Add replay, expiry, quote-binding, and customer-binding tests.

Dependencies

Requires changing both backend session semantics and the frontend portal flow.

────────────────────

### P0-5 — Quote ownership and customer isolation are absent from internal APIs

Severity: P0
Files:
 apps/api/src/modules/quotes/quotes.controller.ts:28-73
 apps/api/src/modules/quotes/quotes.service.ts:40-220
 apps/api/src/modules/billing/billing.service.ts:45-180

Actual behavior

RBAC checks roles but not resource ownership. An authenticated sales rep, manager, finance user, or admin can request arbitrary quote, invoice, and subscription IDs. Quote reads do not filter by  repId , team, tenant, or customer ownership.

Expected behavior

FR-03 and NFR-03 require role- and data-based access control. Customer data must be isolated.

Impact

Users can inspect or mutate unrelated customers’ commercial data. Role authorization is not equivalent to object authorization.

Correction

Introduce centralized policy checks:

• sales reps: own quotes/customers only;
• managers: assigned team or tenant scope;
• finance: authorized financial scope;
• admins: tenant/platform scope;
• customers: only their own portal session’s quote.

Apply policies to every read and write, not only controllers.

Dependencies

Requires tenant/organization modeling and a consistent authorization policy layer.

────────────────────

### P0-6 — Client controls authoritative financial values

Severity: P0
Files:
 packages/types/src/dto/deal-studio.dto.ts:5-22
 apps/api/src/modules/quotes/quotes.service.ts:51-115
 apps/api/src/modules/quotes/quotes.controller.ts:40-55

Actual behavior

The create and calculate DTOs accept  unitPrice  and  unitCost  from the client.  QuotesService.createQuote()  inserts those values into quote lines.  updateQuoteLine()  also accepts a client-supplied  unitPrice .

Expected behavior

Prices, costs, product variants, tax, and discount ceilings must come from authoritative backend configuration. The client may select products and quantities, not redefine accounting values.

Impact

A caller can submit arbitrary prices or costs, manipulate margins, undercharge customers, inflate margins, and potentially bypass approval thresholds.

Correction

• Accept product ID, variant ID, quantity, and requested discount only.
• Resolve active price-list price and cost server-side.
• Verify product/variant relationship and effective dates.
• Recalculate all totals on the server.
• Treat persisted quote values as immutable snapshots after submission.

Dependencies

Requires price-list rules, tenant/customer-tier resolution, product variant validation, and quote revision semantics.

────────────────────

### P0-7 — Customer counter-discount mutates totals without preserving line-level truth

Severity: P0
Files:  apps/api/src/modules/portal/portal.service.ts:103-130,283-315

Actual behavior

The service calculates:

discountedTotal = currentTotal * (1 - counterDiscount / 100)

and updates only the quote total and  counterDiscountPct . Quote line totals and discount fields remain unchanged.

Repeated counter submissions compound discounts against the already-discounted total. The quote header total can disagree with the sum of its lines.

Expected behavior

FR-38–FR-41 require line-level negotiation, threshold evaluation, re-approval, and consistent final terms.

Impact

The customer-facing total, approval BRS, invoice total, and line-level accounting can diverge. The customer may be confirmed at a price that does not correspond to persisted quote lines.

Correction

• Store negotiation proposals as immutable revisions.
• Recalculate all lines from canonical prices and proposed terms.
• Recompute BRS from the proposed revision.
• Approve and confirm a specific revision only.
• Derive quote totals from line rows rather than manually mutating header totals.

Dependencies

Requires a quote revision/proposal model and a formal approval state machine.

────────────────────

### P0-8 — Approval state can be bypassed or contradicted by concurrent quote edits

Severity: P0
Files:
 apps/api/src/modules/quotes/quotes.service.ts:193-224
 apps/api/src/modules/governance/approval-routing.service.ts:34-210,367-650

Actual behavior

Quote-line updates do not verify quote status, approval state, or ownership. A quote can be edited while pending approval. Approval routing reads and updates quote/line state without locking the quote during the full evaluation. Approval decisions also read active steps before updating them and do not use an atomic compare-and-set guard.

Expected behavior

FR-08–FR-10 and FR-23–FR-25 require approval of the actual terms being sent to the customer.

Impact

An approver can approve one set of terms while the customer receives another. Two approvers can potentially act on the same step concurrently.

Correction

• Lock quote and approval rows during submission/decision.
• Reject edits after submission unless a new revision is created.
• Use optimistic versioning or  WHERE status = ... AND current_step = ...  guards.
• Recalculate and persist approval snapshots atomically.
• Add concurrent approval and concurrent edit tests.

Dependencies

Requires quote lifecycle design and database version columns/constraints.

────────────────────

## 3. P1 — Major functional and architectural defects

### P1-1 — RBAC exists, but authorization is role-only and inconsistent

Files:  apps/api/src/modules/*/*.controller.ts

Actual behavior

Controllers use  @Roles() , but policies are inconsistent:

• quote creation was recently restricted to  sales_rep ;
• quote reads are broad;
• analytics was previously unprotected;
• billing and subscription role rules do not match the FRD;
• resource ownership is absent.

Expected behavior

Roles must map to capabilities and data scope, not merely endpoint access.

Impact

The system has a false sense of security: endpoints appear protected while sensitive resources remain accessible across users/customers.

Correction

Create centralized capability and resource policy checks. Define a role matrix from FRD responsibilities and test every endpoint against it.

────────────────────

### P1-2 — Signup UI offers roles the backend cannot safely create

Files:
 apps/web/app/login/page.tsx:137-158,491-550
 apps/web/lib/auth-context.tsx:81-106
 apps/api/src/modules/auth/auth.service.ts:143-150

Actual behavior

The UI offers  admin ,  sales_manager ,  finance , and  customer , while public signup now persists every account as  sales_rep .

Impact

The UI can claim a customer or elevated-role account was created when the backend created a sales rep. Customer routing and authorization become misleading.

Correction

Separate internal provisioning from customer registration. Public signup should create a pending/customer account only; privileged roles must require an authorized admin workflow.

────────────────────

### P1-3 — Analytics frontend route does not match backend/gateway routing

Files:
 apps/web/app/deal-health/page.tsx:47
 apps/web/app/reports/page.tsx:22
 apps/api/src/modules/analytics/analytics.controller.ts:10-12
 apps/api/src/main.ts
 docker/kong/kong.yml

Actual behavior

Frontend requests  /api/v1/analytics/... , while the Nest controller is mounted at  /analytics  and the API does not set a global  api/v1  prefix. Kong does not provide a matching analytics route.

Impact

Analytics requests fail or miss the intended service. The UI often turns failure into empty or fallback content.

Correction

Choose one canonical API prefix and enforce it in Nest, Kong, client configuration, OpenAPI/types, and tests.

────────────────────

### P1-4 — Fulfillment frontend is entirely static

File:  apps/web/app/fulfillment/page.tsx:1-98

Actual behavior

Warehouse stock, orders, quantities, statuses, and warehouse names are hardcoded. There are no API requests or fulfillment actions.

Expected behavior

FR-29–FR-32 require recommended warehouse splits, manual override, stock reservation, and backorder management.

Impact

The acceptance flow cannot be completed from the application. Operators see data that is not necessarily present in the database.

Correction

Build a live fulfillment state model around the existing backend APIs. Render loading/error/empty states and require backend-confirmed actions.

────────────────────

### P1-5 — Approval UI uses fake fallback rows and wrong response mapping

File:  apps/web/app/approvals/page.tsx:22-136

Actual behavior

The page initializes with hardcoded rows and keeps them if the API fails or returns no data. It expects fields such as  blendedRiskScore ,  currentStage ,  assignedRole , and  customerName , while the backend returns different fields.

Decision handlers do not check  res.ok ; failure still updates the row and displays success.

Impact

Approvers can be shown approvals that do not exist and can be told an action succeeded when the backend rejected it.

Correction

• Remove hardcoded production fallback rows.
• Share typed DTOs between backend and frontend.
• Check HTTP and envelope errors.
• Refresh from the server after decisions.
• Render approval steps and audit history from authoritative data.

────────────────────

### P1-6 — Quote submission hides governance failures

File:  apps/web/app/quotations/new/page.tsx:293-305

Actual behavior

The submit request ignores non-2xx responses and redirects to quote detail anyway.

Impact

The UI can imply that a quote entered approval or was sent when it remains draft.

Correction

Treat non-2xx responses as failures, preserve the builder state, and refresh the quote after successful routing.

────────────────────

### P1-7 — Client fallback calculation contradicts server governance

Files:
 apps/web/app/quotations/new/page.tsx:159-195
 apps/api/src/modules/quotes/quote-calculation.service.ts

Actual behavior

The fallback uses a hardcoded 15% ceiling, fabricated BRS  0 , and simplistic  >15% / >20%  thresholds. The backend uses customer tier and category-specific ceilings.

Impact

The UI can show “approved” or “healthy” terms that the backend will route differently.

Correction

Remove the governance fallback. If calculation fails, show an explicit unavailable/error state. The server must be the only authority for price, margin, BRS, and approval routing.

────────────────────

### P1-8 — Portal actions report success on failed requests

File:  apps/web/app/portal/quotes/[token]/page.tsx:104-171

Actual behavior

Counter-proposal failure still appends a local comment. Confirmation failure still sets  confirmed=true .

Impact

Customers can believe a counter or order confirmation was persisted when it was not.

Correction

Check  res.ok , parse the error envelope, update state only from the response, and refetch the quote after mutation.

────────────────────

### P1-9 — Portal realtime contract does not match backend gateway

Files:
 apps/web/app/portal/quotes/[token]/page.tsx:65-90
 apps/api/src/modules/events/negotiation.gateway.ts

Actual behavior

The frontend uses  joinQuoteRoom ,  userPresenceChanged , and  counterProposalSubmitted . The backend uses different event names and payloads. The frontend also hardcodes quote  Q-1042  and a participant identity.

Impact

Realtime collaboration is nonfunctional or attaches users to the wrong quote.

Correction

Define a shared typed event contract, derive quote identity from the authenticated portal session, and test connect/join/broadcast/leave behavior.

────────────────────

### P1-10 — Customer negotiation is not line-level

Files:
 apps/web/app/portal/quotes/[token]/page.tsx:246-275
 apps/api/src/modules/portal/portal.service.ts:283-315

Actual behavior

Only an overall discount and free-text notes are accepted. There is no line ID or persisted line comment/change request.

Expected behavior

FR-38 requires line-level comments/change requests and counter-discount support.

Correction

Add a negotiation proposal and proposal-line model. Persist requested changes, calculate a revision, and route that revision through approval.

────────────────────

### P1-11 — Quote confirmation, payment, and invoice status are not wired end to end

Files:
 apps/api/src/modules/payments/payments.controller.ts
 apps/api/src/modules/billing/billing.controller.ts:34-44
 apps/web/app/quotations/[id]/page.tsx
 apps/web/app/invoices/page.tsx

Actual behavior

The backend exposes payment and confirmation endpoints, but the frontend does not invoke payment processing and has no complete customer payment flow. The invoice UI only lists, views, and voids invoices.

Impact

Acceptance criteria 5–7 cannot be completed through the application.

Correction

Implement a complete state flow:

 approved quote → customer confirmation → order artifacts → invoice → payment gateway → verified webhook → payment/invoice state update .

────────────────────

### P1-12 — Subscription role policy contradicts the FRD

Files:
 apps/web/components/app-header.tsx
 apps/web/app/subscriptions/page.tsx:153-178
 apps/api/src/modules/billing/billing.controller.ts:142-147

Actual behavior

The frontend exposes cancellation to sales reps, while the backend excludes them from cancellation. The FRD assigns subscription cancellation/modification to Rep/Finance.

Correction

Define one role matrix and apply it consistently to API and UI. If cancellation requires finance approval, represent that explicitly rather than allowing a misleading UI action.

────────────────────

### P1-13 — Deal-health nudge is local-only

File:  apps/web/app/deal-health/page.tsx:64-66,141-155

Actual behavior

“Nudge Sent” only updates local React state. No queue, notification, audit record, or escalation exists.

Expected behavior

FR-44 requires automated nudge/escalation behavior.

Correction

Add a backend nudge command, idempotency key, audit event, queue job, and persisted delivery status.

────────────────────

### P1-14 — Billing state transitions are not consistently enforced

Files:
 apps/api/src/modules/billing/billing.service.ts
 packages/database/src/schema/billing.schema.ts

Actual behavior

Many billing statuses are stored as unconstrained  varchar  fields. Methods such as send, void, cancel, and modify perform local checks but do not share a central state-transition policy.

Impact

Invalid transitions can be introduced by future endpoints, direct service calls, retries, or inconsistent controllers.

Correction

Use enums/check constraints where practical and centralize transition commands with explicit allowed source states and idempotent behavior.

────────────────────

### P1-15 — Payment processing is not idempotent

Files:
 apps/api/src/modules/payments/payments.controller.ts
 apps/api/src/modules/payments/mock-payment-gateway.service.ts
 packages/database/src/schema/billing.schema.ts:220-241

Actual behavior

Payments have an optional  gatewayTransactionId  without a unique constraint. Webhook processing records payment based on event delivery without a durable event/idempotency record.

Impact

Retries or duplicate webhook deliveries can create duplicate payments or repeatedly mutate invoice state.

Correction

Add unique gateway event/transaction identifiers, webhook receipt records, atomic “already processed” checks, and invoice/payment reconciliation rules.

────────────────────

### P1-16 — Cross-schema/domain model is inconsistent

Files:
 apps/api/src/modules/analytics/analytics.service.ts:56-73
 packages/database/src/schema/*

Actual behavior

The analytics service queries  deal_studio.quotes  and statuses such as  CONVERTED , while the sales schema uses  sales.quotes  and statuses such as  confirmed ,  fulfilled , and  cancelled .

Impact

Analytics can silently report zero or incorrect data even when quotation data exists.

Correction

Define canonical domain tables and status vocabulary. Analytics should consume authoritative quote events or views generated from the canonical sales model.

────────────────────

## 4. P2 — Significant correctness and maintainability issues

### P2-1 — Product administration is mostly absent

Files:  apps/web/app/products/page.tsx , product/controller services

The backend has partial CRUD, but the frontend is read-only. Product counts, variant counts, and price-list counts are hardcoded. “New Product” and “Manage Price Fields” do nothing.

Correction: Build administrator-only CRUD for products, variants, prices, tiers, and category ceilings.

────────────────────

### P2-2 — Reporting does not implement FRD filters or exports

File:  apps/web/app/reports/page.tsx

Only an unfiltered velocity request exists. PDF uses  window.print() , CSV shows an alert, and fallback values are fabricated.

Correction: Add validated period, rep/team, approval-status, product/category filters and actual PDF/XLS generation.

────────────────────

### P2-3 — Quote builder lacks order-level discounts and explicit recommendation actions

File:  apps/web/app/quotations/new/page.tsx

Discount editing is line-only. Recommendation cards do not expose separate Add/Dismiss actions.

Correction: Model order-level discount explicitly and add persisted recommendation-dismissal behavior if required.

────────────────────

### P2-4 — Quote list/detail loading and error states are incomplete

Files:
 apps/web/app/quotations/page.tsx
 apps/web/app/quotations/[id]/page.tsx

Loading flags are tracked but not reliably rendered. Non-OK responses are often ignored.

Correction: Standardize a typed request state: loading, error, empty, success, stale/revalidating.

────────────────────

### P2-5 — Approval workflow omits Return for Revision and audit presentation

Files:
 apps/web/app/approvals/page.tsx
 apps/api/src/modules/governance/governance.controller.ts

Backend audit endpoints exist, but the UI does not display the audit trail or expose a Return action.

Correction: Add return/revision as a first-class transition and render the complete approval chain/audit history.

────────────────────

### P2-6 — Invoice PDF action is fake

File:  apps/web/app/invoices/page.tsx:332

The UI says the invoice was downloaded without requesting or generating a document.

Correction: Implement a download endpoint or remove the action until available.

────────────────────

### P2-7 — Access-token refresh is missing

Files:
 apps/web/lib/auth-context.tsx:37-79
 apps/web/lib/api-client.ts
 apps/api/src/modules/auth/auth.service.ts:113-117

The backend issues a 15-minute access token and a refresh token, but the frontend stores only the access token. There is no refresh endpoint/use, global 401 handling, or server-side session revalidation.

Correction: Add secure refresh-token rotation, expiry handling, logout/revocation, and centralized API retry behavior.

────────────────────

### P2-8 — Customer list lookup leaks account existence

File:  apps/api/src/modules/portal/portal.service.ts:210-237

 getCustomerQuotesByEmail()  accepts an email and returns quotes without an authenticated portal session.

Correction: Replace email-only lookup with authenticated customer session or verified magic-link exchange.

────────────────────

### P2-9 — Portal implementation has N+1 product queries

File:  apps/api/src/modules/portal/portal.service.ts:40-78,245-280

Each quote line separately queries its product.

Correction: Join quote lines to products in one query and add query-count/performance tests.

────────────────────

### P2-10 — Approval routing uses a silent default discount ceiling

File:  apps/api/src/modules/governance/approval-routing.service.ts:100

Missing category/tier configuration defaults to  10.0 .

Impact: Configuration errors become business decisions instead of explicit failures.

Correction: Require a configured ceiling or use a versioned, explicitly documented policy with audit visibility.

────────────────────

### P2-11 — Billing tax is hardcoded to zero

File:  apps/api/src/modules/billing/order-bifurcation.service.ts:117-125

 taxAmount = 0  is a placeholder despite tax-rate fields existing in product data.

Correction: Implement tax policy or clearly prevent invoice finalization until tax is calculated.

────────────────────

### P2-12 — Invoice send idempotency key is intentionally non-idempotent

File:  apps/api/src/modules/billing/billing.service.ts:250-260

The key includes  Date.now() , so every retry becomes a new operation.

Correction: Use a stable key based on invoice/version/action and persist delivery status.

────────────────────

## 5. Architecture problems

### A. No clear domain boundary

Controllers, services, SQL, workflow transitions, event publication, email queuing, and financial calculations are tightly mixed. For example,  ApprovalRoutingService  both calculates governance, mutates quote lines, creates approvals, writes audits, publishes Kafka events, and queues emails.

Impact: Changes to one workflow can break unrelated concerns. Transaction boundaries and error semantics are difficult to reason about.

Recommended architecture

• Application commands: submit quote, approve step, propose negotiation, confirm quote, reserve stock, issue invoice, record payment.
• Domain services: pricing, discount policy, approval policy, fulfillment allocation, proration.
• Repositories: persistence only.
• Integration adapters: Kafka, queue, payment gateway, email.
• Outbox/event publisher: durable post-commit events.

### B. No formal aggregate/state-machine model

Quotes, approvals, invoices, subscriptions, and fulfillment rows each have status fields, but transitions are distributed across services and controllers.

Impact: Contradictory states are possible, and new endpoints can bypass invariants.

Recommended architecture

Create explicit transition functions and aggregate rules. Persist version/state snapshots and reject invalid source states.

### C. Database is treated as a persistence detail rather than an integrity boundary

Many important relationships and checks are enforced only in TypeScript. Several billing fields are unconstrained strings, and cross-schema foreign keys are missing.

Impact: Direct SQL, retries, future services, and race conditions can create invalid financial state.

────────────────────

## 6. Database and data-integrity findings

### Missing or weak constraints

•  billing.subscriptions.customerId ,  productId ,  quoteId , and  quoteLineId  lack clear foreign keys.
•  billing.invoices.customerId ,  quoteId , and  accountId  lack strong relational enforcement.
•  billing.payments.customerId  is not constrained to invoice customer.
•  gatewayTransactionId  is not unique.
• Billing status fields use  varchar  instead of enums/check constraints.
• Numeric fields lack database-level checks for nonnegative quantities, discount ranges, and monetary values.
• There is no immutable quote revision or price snapshot model.
• There is no durable idempotency-key table for commands/events.
• Tenant/organization identifiers are absent from the core sales and billing schema.

### Index and query concerns

Indexes exist for common foreign-key-like fields, but:

• ownership/tenant queries cannot be efficiently scoped because tenant ownership is not modeled;
• approval active-step lookups are not protected by uniqueness;
• webhook/event deduplication has no indexed event identity;
• portal session/token access is not consistently modeled around active status and quote/customer ownership.

### Migration concerns

 packages/database/src/migrate.ts  contains substantial SQL/bootstrap logic, but the repository lacks a clearly enforced, versioned migration workflow comparable to the schema source. Schema drift between raw migration SQL and Drizzle definitions is a material risk and should be verified in CI.

────────────────────

## 7. Frontend architecture findings

### State management

There is no shared server-state layer. Each page independently manages fetches, loading flags, errors, optimistic updates, and fallback data.

Impact

• duplicated request logic;
• inconsistent error semantics;
• stale data after mutations;
• no cache invalidation strategy;
• optimistic UI not tied to server confirmation.

Recommendation

Use a shared typed API client and a server-state library or consistent request abstraction. Mutations should invalidate/refetch authoritative resources.

### Routing and access control

The header hides links by role, but direct routes remain accessible. Only  /quotations/new  has a client-side redirect. There is no authenticated layout or middleware.

Recommendation

Add route-level auth/role boundaries and an explicit unauthorized page. Treat frontend checks as UX only; keep backend policy authoritative.

### Forms and error handling

Forms often:

• use hardcoded participant identity;
• ignore response envelopes;
• show  alert()  for errors;
• update UI before persistence;
• fall back to demo state after failures.

This is especially dangerous for approvals, portal confirmation, and billing.

────────────────────

## 8. Backend and API contract findings

### Contract drift

Frontend and backend disagree on:

• analytics route prefixes;
• approval response field names;
• portal event names;
• customer portal authentication semantics;
• role behavior for signup and subscription cancellation;
• invoice/payment response expectations.

The shared  packages/types  package is not used as a complete end-to-end contract layer. DTOs validate request shapes but do not validate domain semantics or response compatibility.

### Validation limitations

Zod correctly checks superficial shape for many DTOs, but it does not ensure:

• product exists and is active;
• variant belongs to product;
• submitted price matches price list;
• customer belongs to tenant;
• quote belongs to actor;
• quote state allows modification;
• subscription effective date is valid;
• invoice/payment amount matches outstanding balance;
• counter proposal is based on current quote revision.

────────────────────

## 9. Domain/business-logic findings

### Quotation and pricing

• Client controls price and cost inputs.
• Quote line edits can occur after submission/approval.
• Quote totals are duplicated at header and line level without invariant enforcement.
• Counter discounts mutate totals without line-level recalculation.
• Expiry validation is only applied at submission and is not a complete lifecycle rule.
• Product/customer-tier/category policy resolution is duplicated between calculation and approval paths.

### Approval

• BRS calculation exists, but the approved terms are not immutable.
• Active-step decisions are not concurrency-safe.
• Approval routing can use silent default ceilings.
• Admin can act as any approval role without explicit delegation policy.
• Return-for-revision is missing from the public workflow.

### Fulfillment

• Backend reservation has useful row-locking, but request authorization does not prove the actor may reserve the quote.
• Manual override and backorder consolidation are not fully represented as domain operations.
• Reservation/release operations do not appear to be idempotent by command identity.
• Stock reservation is separate from fulfillment order lifecycle, increasing risk of drift.

### Billing/subscriptions

• Tax is placeholder logic.
• Billing interval is hardcoded to monthly in order bifurcation despite monthly/quarterly/yearly requirements.
• Subscription plans are not authoritative entities attached to products.
• Renewal and schedule execution are not shown as a complete persisted worker flow.
• Cancellation and modification state transitions are not centrally enforced.
• Payment reconciliation is incomplete.

### Analytics

• Analytics mixes schemas/status vocabularies.
• Velocity uses a fixed  averageCycleHours: 4.5 .
• Failure paths return empty arrays, which look like valid “no activity” results.
• Dashboard score calculation is heuristic and not clearly tied to authoritative quote state.
• Nudge/escalation is not persisted.

────────────────────

## 10. Security findings

### Critical

• Default credential authentication.
• Development admin bypass.
• Public quote-ID read/mutate endpoints.
• Magic-link replay through portal endpoints.
• Missing ownership and tenant isolation.
• Client-controlled commercial prices and costs.

### High

• Local storage is trusted for user profile display.
• No refresh-token rotation/revocation flow in frontend.
• Customer lookup by email is public.
• Portal participant identity is client-supplied.
• Internal routes are not guarded at the frontend route level.
• Webhook/payment event deduplication is incomplete.

### Security design recommendation

Adopt a policy model with:

• internal identity and customer identity separated;
• tenant/organization IDs on every business aggregate;
• resource policies in the service layer;
• portal sessions bound to quote/customer;
• immutable audit records;
• explicit event and command idempotency;
• no development authentication bypass in deployed environments.

────────────────────

## 11. Testing audit

### Current state

There are approximately 13 backend test files, primarily unit tests with mocked databases and services.

Examples:

•  apps/api/test/governance.spec.ts
•  apps/api/test/billing-bifurcation.spec.ts
•  apps/api/test/spatial-fulfillment.spec.ts
•  apps/api/test/auth.spec.ts
•  apps/api/test/portal-and-recommendations.spec.ts

### What tests cover

• Pure BRS calculations.
• Mocked billing bifurcation.
• Mocked spatial allocation.
• Auth service behavior.
• DTO parsing.
• Mock payment gateway.
• Some health/logging/anomaly behavior.

### What tests do not adequately cover

• Real HTTP authorization behavior.
• Quote ownership and tenant isolation.
• Cross-role access matrix.
• Public portal attack cases.
• Token replay through portal operations.
• Client-supplied price manipulation.
• Quote edit during approval.
• Concurrent approval decisions.
• Duplicate payment webhooks.
• Duplicate quote confirmation.
• Duplicate stock reservation/release.
• Database constraints and migrations against a real database.
• Frontend route protection and API failure behavior.
• Full browser acceptance flow from quote creation through payment.

### Test quality concern

Many tests mock the database with hand-built query-shape objects. This validates that the service calls the mock in expected ways, but not that the SQL, constraints, joins, transactions, or state transitions work against PostgreSQL.

────────────────────

## 12. Mock, fake, and dead-code problems

### High-risk mocks

•  MockPaymentGatewayService  is wired into the payments module.
• Kafka has offline/simulated emit behavior.
• Frontend approval, fulfillment, portal, dashboard, and reports contain demo data.
• Analytics returns empty fallback data after database errors.
• Quote builder uses a local calculation fallback that differs from production policy.

### Why this is dangerous

Fallbacks are not clearly marked as unavailable states. They make broken integrations appear functional and can result in business decisions based on invented data.

### Recommendation

Use explicit environment-scoped adapters:

• production requires real integration configuration;
• development uses clearly labeled fixtures;
• UI receives an error/unavailable state rather than silently substituting business data;
• integration health is visible to operators.

────────────────────

## 13. Observability and operational concerns

• Correlation ID middleware exists, but correlation context is not consistently propagated through Kafka, queues, and payment events.
• Post-commit event failures are often logged and swallowed.
• Some services use  console.warn/error  instead of structured application logging.
• Metrics do not clearly distinguish database failures from zero business activity.
• No durable outbox pattern is visible for events emitted after financial transactions.
• Queue idempotency is inconsistently applied.
• Error responses are not consistently normalized for frontend consumption.
• Audit trails exist for some approval paths but are not uniformly applied to quote edits, portal changes, fulfillment overrides, billing changes, or payment reconciliation.

────────────────────

## 14. Duplication, coupling, and technical-debt hotspots

Highest-risk hotspots

1.  ApprovalRoutingService
• governance calculation, state mutation, audit, Kafka, email, and queue orchestration in one service.
2.  BillingService
• invoice, credit note, subscription, proration, cancellation, sending, and payment-related behavior in one oversized service.
3.  PortalService
• authentication, quote projection, negotiation, approval triggering, and order confirmation.
4. Frontend page-local fetch/state logic
• repeated request/error/refresh patterns and inconsistent response handling.
5. Duplicate portal methods
• token-based and quote-ID methods implement similar logic with different security properties.
6. Duplicate invoice-number generation
• implemented separately in  OrderBifurcationService  and  BillingService .
7. Repeated role arrays
• role policy is scattered across controllers and header navigation.
8. Repeated financial calculations
• frontend fallback, quote calculation, approval routing, portal discount handling, and billing each calculate amounts differently.

────────────────────

## 15. Recommended dependency-aware remediation roadmap

### Phase 0 — Stop unsafe behavior

Must happen before feature work

1. Remove default login credentials and GET login.
2. Remove implicit development admin authentication.
3. Disable public quote-ID portal operations.
4. Require token/session/quote/customer binding on all portal actions.
5. Add ownership and tenant checks to quotes, invoices, subscriptions, approvals, and fulfillment.
6. Stop accepting client-supplied authoritative price/cost/totals.
7. Disable frontend fake success and offline fallback behavior for business mutations.
8. Ensure payment webhooks are authenticated and idempotent.

Dependencies: identity model, tenant scope decision, portal session design.

────────────────────

### Phase 1 — Establish authoritative domain state

1. Define quote lifecycle and revision model.
2. Define approval lifecycle and immutable approval snapshot.
3. Define negotiation proposal/revision model.
4. Define invoice, payment, subscription, and fulfillment state machines.
5. Add database constraints, foreign keys, enums/checks, unique event IDs, and idempotency keys.
6. Make quote confirmation, invoice creation, subscription creation, and fulfillment orchestration transactionally consistent.
7. Add outbox/event publication for post-commit events.

Dependencies: Phase 0 ownership and pricing model.

────────────────────

### Phase 2 — Correct API contracts

1. Establish a canonical API prefix.
2. Generate/share request and response types.
3. Normalize response/error envelopes.
4. Remove duplicate token/ID portal methods.
5. Align approval, subscription, analytics, payment, and role contracts.
6. Add versioned command endpoints for state transitions.

Dependencies: Phase 1 domain commands.

────────────────────

### Phase 3 — Replace frontend prototype behavior

1. Add authenticated layouts and route-level role states.
2. Remove hardcoded dashboard, approval, fulfillment, product, report, and portal data.
3. Add typed API client and shared server-state/cache invalidation.
4. Implement proper loading/error/empty states.
5. Make mutations update only after backend confirmation.
6. Build actual fulfillment, payment, audit, and report surfaces.
7. Remove fake PDF/export/nudge controls or implement them fully.

Dependencies: Phase 2 contracts.

────────────────────

### Phase 4 — Complete configuration and business features

1. Product variants and price-list administration.
2. Customer-tier and category-specific discount configuration.
3. Approval-chain configuration.
4. Warehouse/replenishment configuration.
5. Subscription-plan and proration-rule configuration.
6. Recommendation administration.
7. Tax calculation and invoice document generation.
8. Customer line-level negotiation and revision approval.

Dependencies: authoritative domain and admin authorization.

────────────────────

### Phase 5 — Verification and operational hardening

1. Real PostgreSQL migration/constraint tests.
2. HTTP-level RBAC and ownership tests.
3. End-to-end browser flow:
• setup;
• quote creation;
• approval;
• customer negotiation;
• reapproval;
• confirmation;
• fulfillment;
• invoice;
• payment;
• status reconciliation.
4. Concurrency tests for quote edits, approvals, reservations, confirmation, and webhooks.
5. Retry/idempotency tests.
6. Structured logging, correlation propagation, metrics, alerts, and integration health checks.
7. Remove obsolete mocks and dead paths.

────────────────────

## Final classification

### A. Working correctly

• Basic internal login verification.
• JWT generation.
• Basic role guard mechanism.
• Product reads.
• Basic quote persistence.
• Pure BRS calculation.
• Some transactional stock and billing primitives.
• Subscription proration calculations in isolation.
• Several unit-level backend tests.

### B. Incorrect but repairable

• Quote submission/error handling.
• Approval queue and response mapping.
• Subscription role policies.
• Analytics routing.
• Frontend loading/error states.
• Report filters and exports.
• Portal negotiation UI.
• Invoice and payment UI.
• Product/configuration screens.

### C. Architecturally problematic

• No formal aggregate/state-machine model.
• Role-only RBAC without resource policies.
• No tenant boundary.
• Business calculations duplicated across UI and backend.
• Oversized orchestration services.
• Direct SQL and domain logic mixed throughout services.
• No durable outbox/idempotency architecture.
• Mock and production behavior interleaved.

### D. Missing

• Complete admin configuration area.
• Live fulfillment UI.
• Payment/customer payment flow.
• Line-level negotiation revisions.
• Real report exports.
• Persisted nudges/escalations.
• Comprehensive integration and browser tests.
• Reliable refresh/session lifecycle.

### E. Dangerous/security-sensitive

• Default credential login.
• Development administrator bypass.
• Public quote-ID portal mutations.
• Magic-link replay.
• Missing resource ownership and tenant isolation.
• Client-controlled prices/costs/totals.
• Non-idempotent payment/webhook handling.
• False frontend success states for financial/workflow actions.

### F. Cosmetic/low-priority

• Repeated  alert()  usage.
• Hardcoded labels and placeholder text.
• Navigation differences from FRD.
• Minor component duplication.
• Inconsistent formatting and logging style.

---

Conclusion: The project should not receive additional customer-facing or financial features until Phase 0 and Phase 1 are complete. Incremental remediation is feasible, but it must begin by establishing security boundaries, server-authoritative pricing and workflow state, and transaction/idempotency guarantees.
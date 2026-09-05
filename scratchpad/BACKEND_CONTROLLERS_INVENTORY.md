# DealFlow360 - Backend Controllers & Endpoints Inventory

This document maps all 13 backend controllers in `apps/api/src/modules`, their HTTP methods, exact routes, authorization guards, request/query schemas, and responses.

---

## 1. AuthController (`apps/api/src/modules/auth/auth.controller.ts`)
- **Base Route**: `/api/v1`
- **Guards**: Public (no JWT required)

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/api/v1/internal/auth/login`<br/>`/api/v1/auth/login` | Public | `LoginRequestSchema`<br/>`{ email, password }` | Authenticates employee user. Returns `{ data: { user, tokens: { accessToken, refreshToken, expiresIn } } }` |
| `POST` | `/api/v1/portal/auth/magic-link/request` | Public | `MagicLinkRequestSchema`<br/>`{ email, quoteId }` | Generates customer portal magic link token. Returns `{ data: { message, token, portalUrl, expiresAt } }` |
| `POST` | `/api/v1/portal/auth/magic-link/verify` | Public | `MagicLinkVerifySchema`<br/>`{ token }` | Validates magic link. Returns `{ data: { token, quoteId, customerId, expiresAt } }` |

---

## 2. QuotesController (`apps/api/src/modules/quotes/quotes.controller.ts`)
- **Base Route**: `/api/v1/sales`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `GET` | `/api/v1/sales/quotes` | `admin`, `sales_rep`, `sales_manager`, `finance` | None | Lists all quotes. Returns `{ data: Quote[] }` |
| `GET` | `/api/v1/sales/customers` | `admin`, `sales_rep`, `sales_manager`, `finance` | None | Lists all customers (with tier and metadata). Returns `{ data: Customer[] }` |
| `POST` | `/api/v1/sales/quotes/calculate` | `admin`, `sales_rep`, `sales_manager`, `finance` | `CalculateQuoteSchema`<br/>`{ customerId, currency, items: [...] }` | Pricing engine calculation with tiered discounts. Returns `{ data: CalculationResult }` |
| `POST` | `/api/v1/sales/quotes` | `admin`, `sales_rep` | `CreateQuoteSchema`<br/>`{ customerId, currency, items, notes }` | Creates a new quote in draft state. Returns `{ data: Quote }` |
| `GET` | `/api/v1/sales/quotes/:id` | `admin`, `sales_rep`, `sales_manager`, `finance` | Param `:id` | Gets quote by ID with line items & version history. Returns `{ data: QuoteDetail }` |
| `PATCH` | `/api/v1/sales/quotes/lines/:lineId` | `admin`, `sales_rep` | `UpdateQuoteLineSchema`<br/>`{ quantity?, discountPct?, customNotes? }` | Updates a specific quote line item. Returns `{ data: QuoteLine }` |
| `POST` | `/api/v1/sales/quotes/lines/:lineId/comments` | `admin`, `sales_rep`, `sales_manager`, `finance` | `CreateLineCommentSchema`<br/>`{ comment }` | Appends comment to quote line item. Returns `{ data: LineComment }` |

---

## 3. ProductsController (`apps/api/src/modules/products/products.controller.ts`)
- **Base Route**: `/api/v1/sales/products`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/api/v1/sales/products` | `admin` | `CreateProductSchema` | Creates a new product catalog entry. Returns `{ data: Product }` |
| `GET` | `/api/v1/sales/products` | `admin`, `sales_rep`, `sales_manager`, `finance` | Query: `category`, `search`, `page`, `limit` | Paginated product list. Returns `{ data: Product[], meta: { page, limit, total, totalPages } }` |
| `GET` | `/api/v1/sales/products/:id` | `admin`, `sales_rep`, `sales_manager`, `finance` | Param `:id` | Product details. Returns `{ data: Product }` |
| `PATCH` | `/api/v1/sales/products/:id` | `admin` | `UpdateProductSchema` | Updates product details. Returns `{ data: Product }` |
| `DELETE` | `/api/v1/sales/products/:id` | `admin` | Param `:id` | Soft/hard deletes product. Returns `{ data: Product }` |

---

## 4. PriceListsController (`apps/api/src/modules/price-lists/price-lists.controller.ts`)
- **Base Route**: `/api/v1/sales/price-lists`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/api/v1/sales/price-lists` | `admin`, `finance` | `CreatePriceListSchema` | Creates a price list (standard, enterprise, seasonal). Returns `{ data: PriceList }` |
| `GET` | `/api/v1/sales/price-lists` | `admin`, `sales_rep`, `sales_manager`, `finance` | None | Lists all active price lists. Returns `{ data: PriceList[] }` |
| `POST` | `/api/v1/sales/price-lists/:id/items` | `admin`, `finance` | `BulkPriceListItemsSchema` | Adds or updates price list items/overrides in bulk. Returns `{ data: PriceListItem[] }` |
| `GET` | `/api/v1/sales/price-lists/:id` | `admin`, `sales_rep`, `sales_manager`, `finance` | Param `:id` | Fetches a single price list with items. Returns `{ data: PriceListDetail }` |

---

## 5. CustomerTiersController (`apps/api/src/modules/customer-tiers/customer-tiers.controller.ts`)
- **Base Route**: `/api/v1/sales/customer-tiers`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/api/v1/sales/customer-tiers` | `admin` | `CreateCustomerTierSchema` | Creates a customer tier (Bronze, Silver, Gold, Platinum). Returns `{ data: CustomerTier }` |
| `GET` | `/api/v1/sales/customer-tiers` | `admin`, `sales_rep`, `sales_manager`, `finance` | None | Lists all customer tiers. Returns `{ data: CustomerTier[] }` |
| `PATCH` | `/api/v1/sales/customer-tiers/:id` | `admin` | `Partial(CreateCustomerTierSchema)` | Updates discount rates and benefits for tier. Returns `{ data: CustomerTier }` |

---

## 6. RecommendationsController (`apps/api/src/modules/recommendations/recommendations.controller.ts`)
- **Base Route**: `/api/v1/sales/recommendations`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/api/v1/sales/recommendations` | `admin`, `sales_rep`, `sales_manager` | `QueryRecommendationsSchema`<br/>`{ customerId, currentProductIds }` | Collaborative filtering recommendations and bundles. Returns `{ data: Recommendation[], meta: { total } }` |

---

## 7. GovernanceController (`apps/api/src/modules/governance/governance.controller.ts`)
- **Base Route**: `/api/v1`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/api/v1/quotes/:id/submit`<br/>`/api/v1/sales/quotes/:id/submit`<br/>`/api/v1/internal/quotes/:id/submit` | `admin`, `sales_rep`, `sales_manager` | Param `:id` | Evaluates margin/discount rules and routes quote to manager or finance approval queue. Returns status & approval records. |
| `GET` | `/api/v1/approvals`<br/>`/api/v1/sales/approvals`<br/>`/api/v1/internal/approvals` | `sales_manager`, `finance`, `admin` | None | Fetches pending approvals for the current user's role. Returns `{ data: PendingApproval[] }` |
| `GET` | `/api/v1/approvals/:id`<br/>`/api/v1/sales/approvals/:id`<br/>`/api/v1/internal/approvals/:id` | `sales_manager`, `finance`, `admin` | Param `:id` | Details of an approval request with trigger reasons. Returns `{ data: ApprovalDetail }` |
| `POST` | `/api/v1/approvals/:id/approve`<br/>`/api/v1/sales/approvals/:id/approve`<br/>`/api/v1/sales/quotes/:id/approve` | `sales_manager`, `finance`, `admin` | `{ comment?: string }` | Approves the step, advances workflow or updates quote to `APPROVED`. |
| `POST` | `/api/v1/approvals/:id/reject`<br/>`/api/v1/sales/approvals/:id/reject`<br/>`/api/v1/sales/quotes/:id/reject` | `sales_manager`, `finance`, `admin` | `{ reason: string }` | Rejects quote approval with reason, setting quote status to `REJECTED`. |
| `GET` | `/api/v1/audit/:entityType/:entityId`<br/>`/api/v1/sales/audit/:entityType/:entityId` | `sales_manager`, `finance`, `admin` | Params `:entityType`, `:entityId` | Immutable audit log trail for quote or contract. |

---

## 8. BillingController (`apps/api/src/modules/billing/billing.controller.ts`)
- **Base Route**: `/api/v1`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/api/v1/sales/quotes/:id/confirm` | `admin`, `sales_rep`, `sales_manager`, `finance` | Param `:id` | Confirms quote, executes **Order Bifurcation Engine** (splitting physical lines to warehouse fulfillment & recurring lines to subscriptions/invoices). Returns `{ data: BifurcationResult }` |
| `GET` | `/api/v1/internal/invoices` | `admin`, `finance`, `sales_manager`, `sales_rep` | Query: `customer_id`, `status`, `page`, `limit` | Paginated list of generated invoices. Returns `{ data: Invoice[], meta }` |
| `GET` | `/api/v1/internal/invoices/:id` | `admin`, `finance`, `sales_manager`, `sales_rep` | Param `:id` | Single invoice detail with line items & payment history. Returns `{ data: Invoice }` |
| `POST` | `/api/v1/internal/invoices/:id/send` | `admin`, `finance` | `SendInvoiceSchema`<br/>`{ recipientEmail?, deliveryMethod }` | Dispatches invoice to customer. Returns `{ data: Invoice }` |
| `POST` | `/api/v1/internal/invoices/:id/void` | `admin`, `finance` | `VoidInvoiceSchema`<br/>`{ reason }` | Voids unpaid invoice and issues credit adjustment. Returns `{ data: Invoice }` |
| `GET` | `/api/v1/internal/invoices/:id/credit-notes` | `admin`, `finance` | Param `:id` | Lists credit notes linked to invoice. Returns `{ data: CreditNote[] }` |
| `GET` | `/api/v1/internal/subscriptions` | `admin`, `finance`, `sales_manager`, `sales_rep` | Query: `customer_id`, `status`, `page`, `limit` | Paginated subscriptions. Returns `{ data: Subscription[], meta }` |
| `GET` | `/api/v1/internal/subscriptions/:id` | `admin`, `finance`, `sales_manager`, `sales_rep` | Param `:id` | Subscription details, pricing model, billing cycle. Returns `{ data: Subscription }` |
| `GET` | `/api/v1/internal/subscriptions/:id/billing-schedule` | `admin`, `finance`, `sales_manager`, `sales_rep` | Param `:id` | Forward billing schedule dates and amounts. Returns `{ data: Schedule[] }` |
| `GET` | `/api/v1/internal/subscriptions/:id/proration-preview` | `admin`, `finance`, `sales_manager`, `sales_rep` | `ProrationPreviewQuerySchema`<br/>`{ targetQuantity, effectiveDate }` | Previews proration cost calculation without committing. Returns `{ data: ProrationPreview }` |
| `PATCH` | `/api/v1/internal/subscriptions/:id/quantity` | `admin`, `sales_rep`, `sales_manager`, `finance` | `ModifySubscriptionQuantitySchema`<br/>`{ newQuantity, reason }` | Modifies seats/quantity with mid-cycle proration billing. Returns `{ data: Subscription }` |
| `POST` | `/api/v1/internal/subscriptions/:id/cancel` | `admin`, `finance`, `sales_manager` | `CancelSubscriptionSchema`<br/>`{ reason, cancelAtPeriodEnd }` | Cancels subscription immediately or at period end. Returns `{ data: Subscription }` |

---

## 9. FulfillmentController (`apps/api/src/modules/fulfillment/fulfillment.controller.ts`)
- **Base Route**: `/api/v1/fulfillment` and `/api/v1/sales/fulfillment`
- **Guards**: `JwtAuthGuard`, `RolesGuard`

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `GET` | `/api/v1/fulfillment/warehouses` | `admin`, `sales_rep`, `sales_manager`, `finance` | None | Lists regional fulfillment warehouses & coordinates. Returns `{ data: Warehouse[] }` |
| `GET` | `/api/v1/fulfillment/stock` | `admin`, `sales_rep`, `sales_manager`, `finance` | Query: `productId`, `warehouseId` | Multi-warehouse stock levels, reserved units, and available capacity. Returns `{ data: StockOverview[] }` |
| `GET` | `/api/v1/fulfillment/splits/:quoteId` | `admin`, `sales_rep`, `sales_manager`, `finance` | Param `:quoteId` | Fetches calculated fulfillment plan/splits for a quote. Returns `{ data: FulfillmentSplitPlan }` |
| `POST` | `/api/v1/fulfillment/calculate` | `admin`, `sales_rep`, `sales_manager`, `finance` | `CalculateFulfillmentSplitSchema` | Calculates nearest warehouse allocation using Spatial / Haversine engine. Returns `{ data: FulfillmentPlan }` |
| `POST` | `/api/v1/fulfillment/calculate-async` | `admin`, `sales_rep`, `sales_manager`, `finance` | `CalculateFulfillmentSplitSchema` | Enqueues split calculation to BullMQ async queue. Returns `{ data: { queued: true } }` |
| `POST` | `/api/v1/fulfillment/reserve` | `admin`, `sales_rep`, `sales_manager` | `ReserveStockRequestSchema` | Locks inventory stock for pending quotes. Returns `{ data: Reservation[] }` |
| `POST` | `/api/v1/fulfillment/release` | `admin`, `sales_rep`, `sales_manager` | `ReleaseStockRequestSchema` | Releases locked inventory stock. Returns `{ data: ReleaseResult }` |

---

## 10. PortalController (`apps/api/src/modules/portal/portal.controller.ts`)
- **Base Route**: `/api/v1/portal/quotes`
- **Guards**: Public endpoint with magic-link token validation

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `GET` | `/api/v1/portal/quotes/view` | Public, magic-link token required | Query: `token` | Returns sanitized quote view for customer (redacts internal margin, cost, audit). Returns `{ data: CustomerQuoteView }` |
| `POST` | `/api/v1/portal/quotes/counter` | Public, magic-link token required | Query: `token`<br/>Body: `CustomerCounterProposalSchema` | Submits customer counter-offer (requested discount, custom terms). Returns `{ data: CounterProposalResult }` |
| `POST` | `/api/v1/portal/quotes/confirm` | Public, magic-link token required | Query: `token`<br/>Body: `{ participantName?: string }` | Customer digitally accepts/signs quote, transitioning status to `ACCEPTED`. Returns `{ data: ConfirmationResult }` |

Identifier-based quote routes and email-only quote listing were removed because quote IDs and customer email addresses are not authentication credentials.

---

## 11. AnalyticsController (`apps/api/src/modules/analytics/analytics.controller.ts`)
- **Base Route**: `/analytics`
- **Guards**: Open (Tenant header `x-tenant-id`)

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `GET` | `/analytics/deal-health` | Any | Query: `startDate`, `endDate`, `salesRepId`, `status` | Aggregated deal health score, win probability, margin breakdown. |
| `GET` | `/analytics/velocity` | Any | None | Average sales cycle days, velocity through stages, bottleneck stages. |
| `GET` | `/analytics/anomalies/discount` | Any | Query: `repId`, `discountPct`, `category` | Detects discount outliers (> 3 std dev or role thresholds). |
| `GET` | `/analytics/stalled-deals` | Any | Query: `thresholdDays` (default 7) | Identifies deals inactive beyond threshold days. |

---

## 12. PaymentsController (`apps/api/src/modules/payments/payments.controller.ts`)
- **Base Route**: `/payments`
- **Guards**: Public / WebhookSignatureGuard

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `POST` | `/payments/process` | Public / Tenant | `ProcessPaymentRequestSchema`<br/>`{ invoiceId, amount, currency, paymentMethod, paymentToken }` | Invokes Mock Payment Gateway (supports 3DS challenge, instant success, or decline test card tokens). Automatically updates invoice in billing engine. |
| `POST` | `/payments/webhook` | `WebhookSignatureGuard` | `WebhookEventPayloadSchema`<br/>`{ eventType, transactionId, invoiceId, amount }` | Handles payment gateway webhooks (e.g. `payment_intent.succeeded` after 3DS resolution). Settles invoice in database. |

---

## 13. HealthController (`apps/api/src/modules/health/health.controller.ts`)
- **Base Route**: `/health`
- **Guards**: Public

| Method | Route | Auth / Roles | Request Body / Query | Description / Response |
|---|---|---|---|---|
| `GET` | `/health` | Public | None | Shallow liveness probe. Returns `{ status: 'ok', timestamp, uptime }` |
| `GET` | `/health/ready` | Public | None | Deep readiness check: verifies PostgreSQL connectivity (`SELECT 1`) and Redis ping. Returns `{ status: 'ready' \| 'degraded', checks }` |

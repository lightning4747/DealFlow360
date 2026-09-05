# Task Breakdown & Delivery Matrix — Spatial Fulfillment & Inventory Allocation Engine

> **Status:** Pending Execution  
> **Phase Scope:** PostGIS 3.4 Spatial Indexing, Geodetic Distance Calculations, Cost-Weighted Multi-Variable Split Allocation Algorithm, Concurrency-Safe Stock Reservation, Fulfillment Operations UI

---

## 1. Task Distribution Matrix

| Workstream | Domain | Key Responsibilities | Deliverables | Status |
|---|---|---|---|:---:|
| **Database** | Spatial & Storage | PostGIS spatial indexing (GIST), geodetic distance functions, warehouse tables | `0003_spatial_fulfillment.sql`, Drizzle models | ⏳ Pending |
| **Backend** | Logistics & Reservation | Split allocation API, concurrency-safe stock locking, backorder generation | `FulfillmentModule`, `StockReservationService` | ⏳ Pending |
| **Infrastructure** | Spatial Algorithmic Core | Multi-variable Cost-Weighted Warehouse Allocation Engine, BullMQ split worker | `SpatialAllocationEngine`, BullMQ `fulfillment-split` queue | ⏳ Pending |
| **Frontend** | Fulfillment Console | Next.js Fulfillment Management Console with split preview and manual override | `apps/web/app/fulfillment/*` | ⏳ Pending |

---

## 2. Granular Task Breakdown

### 2.1 Database (DB)
- [ ] Implement PostGIS GIST spatial indexes on `customers.delivery_point` and `fulfillment.warehouses.location`.
- [ ] Implement table `fulfillment.fulfillment_splits` linking `quote_id`, `product_id`, `warehouse_id`, `quantity`, `shipping_cost`, and status.
- [ ] Implement PostgreSQL function utilizing `ST_DistanceSphere` or `ST_DistanceSpheroid` for accurate geodetic kilometers computation.
- [ ] Define atomic inventory check constraints (`available_qty >= 0`, `reserved_qty >= 0`).

### 2.2 Backend (Logistics & Reservation Services)
- [ ] Implement `StockReservationService`:
  - Atomic two-phase stock locking with PostgreSQL `SELECT ... FOR UPDATE`.
  - Decrement `available_qty` and increment `reserved_qty` upon deal confirmation.
  - Release reserved stock automatically if split is cancelled or rejected.
- [ ] Implement backorder generation workflow for quantities exceeding total network availability.
- [ ] Build fulfillment operations endpoints (`GET /api/v1/sales/quotes/:id/fulfillment`, `PATCH /override`, `POST /commit`).

### 2.3 Infrastructure & Spatial Algorithmic Core (Infra)
- [ ] Implement the **Cost-Weighted Warehouse Split Allocation Algorithm**:
  - Distance cost component: $C_{\text{dist}} = d(W_j, C) \times R_{\text{rate}}$
  - Inventory availability penalty factor.
  - Optimization function minimizing combined freight cost while avoiding partial splits where a single hub suffices.
- [ ] Implement BullMQ worker `fulfillment-split`:
  - Asynchronous background calculation triggered when quote moves to `confirmed`.
  - Concurrency control preventing race conditions on simultaneous checkouts of limited SKU quantities.
- [ ] Dead-letter queue handling for unfulfillable routing errors.

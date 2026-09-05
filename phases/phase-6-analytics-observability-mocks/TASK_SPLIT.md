# Task Breakdown & Delivery Matrix — Analytics, Observability, Alerting & Mock Integrations

> **Status:** Pending Execution  
> **Phase Scope:** TimescaleDB Continuous Aggregates, Universal Correlation Tracing, Deal Health & Discount Anomaly Dashboards, Mock Payment Gateway, Alerting Stacks

---

## 1. Task Distribution Matrix

| Workstream | Domain | Key Responsibilities | Deliverables | Status |
|---|---|---|---|:---:|
| **Database** | Time-Series & Rollups | TimescaleDB hypertables, continuous aggregates, discount retention views | `0005_timescaledb_analytics.sql`, continuous aggregates | ⏳ Pending |
| **Backend** | Telemetry & Health API | Deal Health calculations, anomaly detection algorithms ($z > 2.0$), health probes | `AnalyticsModule`, `DealHealthService`, `/health` endpoints | ⏳ Pending |
| **Infrastructure** | Telemetry & Mock Rails | Mock Payment Gateway Service (3DS delays), structured JSON logging, Grafana/Prometheus | Mock payment service, Grafana dashboards, Prometheus metrics | ⏳ Pending |
| **Frontend** | Executive Health UI | Deal Health Dashboard with anomaly alert banners and revenue aggregate graphs | `apps/web/app/analytics/*` | ⏳ Pending |

---

## 2. Granular Task Breakdown

### 2.1 Database (DB)
- [ ] Initialize TimescaleDB hypertables on `analytics.price_history` and `analytics.quote_events` partitioned by 7-day intervals.
- [ ] Create TimescaleDB continuous aggregate views for hourly and daily revenue rollups (`daily_revenue_summary`, `rep_discount_summary`).
- [ ] Implement data retention and chunk compression policies (compress after 30 days, retain for 365 days).
- [ ] Create database indexes optimized for time-series range queries and rep-level aggregation.

### 2.2 Backend (Telemetry & Statistical Anomaly Engine)
- [ ] Implement `DealHealthService`:
  - Statistical discount anomaly detection: calculate rolling mean ($\mu$) and standard deviation ($\sigma$) per rep and product category; flag quotes with $z$-score $> 2.0$:
    $$z = \frac{\text{Discount} - \mu}{\sigma}$$
  - Deal stall detection: automatically identify open deals with no activity for $> 7$ days.
- [ ] Implement Kubernetes-compliant NestJS health check endpoints:
  - Liveness probe: `/health`
  - Readiness probe: `/health/ready` verifying PostgreSQL, Redis, Kafka, and Elasticsearch connectivity.
- [ ] Expose Prometheus metrics scraping endpoint (`/metrics`) using `prom-client`.

### 2.3 Infrastructure, Mock Payment Gateway & Alerting (Infra)
- [ ] Build **Mock Payment Gateway Service**:
  - Deterministic card number simulation (success, insufficient funds, network timeout).
  - Simulating 3DS authentication flow with artificial 5-second asynchronous callback delays (`DELAYED_3DS`).
- [ ] Enforce zero-plain-text structured JSON logging with universal `X-Correlation-ID` propagation across HTTP, Kafka, and BullMQ boundaries via `AsyncLocalStorage`.
- [ ] Provision Grafana dashboard manifests and Prometheus alerting rules (alerting on sustained error rates $> 1\%$ or Kafka consumer lag $> 500$).

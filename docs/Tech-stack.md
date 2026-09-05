**Frontend Stack**

* **Framework:** Next.js (`next`, `react`, `react-dom`)
* **Styling, Design System & Icons:** Tailwind CSS, Shadcn UI / Radix Primitives (`clsx`, `tailwind-merge`, `lucide-react`)
* **State & Data Fetching:** TanStack Query (`@tanstack/react-query`), Zustand (`zustand`)
* **Forms & Validation:** React Hook Form (`react-hook-form`), Zod (`zod`, `@hookform/resolvers`)
* **Real-time & Data Visualization:** Socket.IO Client (`socket.io-client`), Yjs CRDTs (`yjs`, `y-websocket`), Recharts (`recharts`)

**Backend Stack**

* **Framework & Architecture:** NestJS (`@nestjs/core`, `@nestjs/common`, `@nestjs/platform-express`, `@nestjs/websockets`, `@nestjs/platform-socket.io`, `@nestjs/microservices`)
* **Database, ORM & Drivers:** PostgreSQL (`pg`), Drizzle ORM (`drizzle-orm`)
* **Authentication & Security:** Better Auth (`better-auth`), Helmet (`helmet`), Express Rate Limit (`express-rate-limit`)
* **Validation & Utilities:** Zod (`zod`), Nodemailer (`nodemailer`), Yjs (`yjs`)
* **Message Queues & Caching:** BullMQ (`bullmq`, `@nestjs/bullmq`), Redis Client (`ioredis`), Kafka Client (`kafkajs`)
* **Search Engine:** Elasticsearch Client (`@elastic/elasticsearch`)
* **Real-time Server:** Socket.IO Server (`socket.io`)

**API Gateway & Ingress**

* **API Gateway / Proxy:** Kong API Gateway

**Infrastructure & Services (Docker Containers)**

* **Database Engine:** PostgreSQL 16 (with `timescaledb` and `postgis` extensions)
* **In-Memory Store / Cache:** Redis 7
* **Message Broker:** Apache Kafka (KRaft mode)
* **Search Engine:** Elasticsearch 8
* **API Gateway Engine:** Kong
* **Management & Observability:** Kong Manager, Kafka UI, Grafana
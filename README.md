# Multi-Tenant Event Scheduling Platform

A NestJS backend for multi-tenant event management with atomic capacity enforcement and conflict detection. Built with GraphQL (code-first), MongoDB (replica set for transactions), and Redis cache.

## Prerequisites

- Node.js LTS (v22)
- Docker and Docker Compose
- pnpm

## Quick Start

**1. Install dependencies:**

```bash
pnpm install
```

**2. Start infrastructure (MongoDB replica set + Redis):**

```bash
docker compose up -d
```

**3. Create environment file:**

```bash
cp .env.example .env
```

**4. Start the application:**

```bash
pnpm run start:dev
```

**5. Open GraphQL playground:**

```
http://localhost:3000/graphiql
```

> See [GRAPHQL_EXAMPLES.md](GRAPHQL_EXAMPLES.md) for ready-to-use queries and mutations with seed data.

**6. (Optional) Seed sample data:**

```bash
pnpm seed
```

> Every GraphQL request requires an `x-tenant-id` header with the organization UUID. The seed script logs the created organization UUIDs to the console. In the GraphQL playground, set this header via the "Headers" panel.

## Environment Variables

| Variable      | Required | Default                                                    | Description                                                       |
| ------------- | -------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| `MONGODB_URI` | Yes      | `mongodb://localhost:27017/event-scheduler?replicaSet=rs0` | MongoDB connection string (replica set required for transactions) |
| `REDIS_URL`   | No       | `redis://localhost:6379`                                   | Redis connection URL                                              |
| `PORT`        | No       | `3000`                                                     | HTTP port the app listens on                                      |
| `LOG_LEVEL`   | No       | `info`                                                     | Pino log level (trace/debug/info/warn/error)                      |
| `NODE_ENV`    | No       | `development`                                              | Node environment                                                  |
| `IS_LOCAL`    | No       | `false`                                                    | Enables pretty-print logging locally                              |

## Running Tests

| Command         | Description                                                              |
| --------------- | ------------------------------------------------------------------------ |
| `pnpm test`     | Unit tests using in-memory repositories (~86 tests, ~5 seconds)          |
| `pnpm test:int` | Integration tests against real MongoDB (requires Docker Compose running) |
| `pnpm test:e2e` | End-to-end GraphQL tests (requires Docker Compose running)               |

## Technical Choices

**NestJS + Fastify + Mercurius**
NestJS provides the module system and dependency injection. Fastify is used over Express for throughput and lower overhead. Mercurius is the only production-ready, Fastify-native GraphQL driver — Apollo Server does not natively integrate with Fastify's request lifecycle without an adapter layer.

**MongoDB with replica set**
MongoDB transactions (multi-document atomicity) require a replica set. The platform's two core invariants — capacity enforcement and conflict detection — both execute inside `session.withTransaction()` to prevent race conditions. A single-node MongoDB cannot provide the `readConcern: snapshot` isolation these transactions depend on.

**Redis with ioredis**
Cache-aside pattern with tenant-scoped keys (`{tenantId}:{resource}:{hash}`). Read-through caching on all list queries. Event-driven cache invalidation via domain events — when an event is updated or deleted, the corresponding occurrence and registration caches are invalidated immediately. TTL-based expiry provides a safety net.

**CQRS + hexagonal architecture**
Commands never return data; queries bypass the domain layer and read directly from the database via Prisma-style read models. Four strict layers (domain, application, infrastructure, presentation) prevent business logic from leaking into transport or persistence concerns. See [ARCHITECTURE.md](ARCHITECTURE.md) for the full layer diagram and dependency rules.

**Separate collections multi-tenancy**
Each organization gets physically isolated MongoDB collections: `{tenantSlug}_events`, `{tenantSlug}_occurrences`. A `TenantConnectionRegistry` resolves the correct Mongoose model at query time using a single shared connection — no per-tenant connections, no cross-tenant data leakage from missing filter clauses.

**Zod for validation**
Single schema source of truth for both runtime validation and TypeScript types (`z.infer<typeof Schema>`). No `class-validator` or `class-transformer`. Request DTOs are validated at the presentation boundary before dispatch to command/query handlers.

See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed schema design, alternatives considered, and trade-offs.

## Project Structure

```
src/
  modules/
    organization/   # Tenant identity (create org, resolve slug for TenantGuard)
    event/          # Events + occurrences + recurrence pattern materialization
    registration/   # Capacity enforcement + conflict detection
  shared/           # Base classes, CLS context, cache service, logging, CQRS wrappers
  config/           # Environment validation (Zod schema)
```

## Future Work

- **Testcontainers for CI** — integration and e2e tests currently require a pre-running Docker Compose stack. Testcontainers would make them self-contained and CI-friendly.
- **Occurrence re-expansion job** — recurring event occurrences are materialized at create/update time up to `MAX_OCCURRENCES`. A scheduled job should expand the occurrence horizon as the event window moves forward.
- **Authentication and authorization** — `userId` and `organizationId` are currently caller-provided with no authentication layer. A JWT-based auth layer with org membership verification is required before production use.
- **Rate limiting** — no throttling is currently applied to GraphQL mutations. NestJS `ThrottlerModule` should be added to protect capacity-sensitive operations.
- **DataLoader for N+1 prevention** — nested GraphQL resolvers (e.g., `event.occurrences`) currently issue per-event queries. DataLoader batching would reduce round-trips significantly under load.

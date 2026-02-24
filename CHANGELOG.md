# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/),
and this project adheres to [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.0] - 2026-02-24

### Added
- ARCHITECTURE.md with schema design, alternatives considered, and trade-offs
- README.md with quick-start setup instructions and technical choices
- CHANGELOG.md following Keep a Changelog format
- AGENT.md documenting AI development workflow

## [0.4.0] - 2026-02-24

### Added
- Redis cache-aside layer on event, occurrence, and registration queries (TTL-based with tenant-scoped keys)
- 5 cache invalidation event handlers triggered by domain events
- Unit tests for CreateOrganization, CreateEvent, UpdateEvent, DeleteEvent command handlers
- Integration tests for all 4 query handlers (GetOrganization, GetEvents, GetOccurrences, GetRegistrations)
- E2e test suites for organization, event, and registration GraphQL APIs
- Concurrency test proving atomic capacity enforcement under parallel requests
- Idempotent seed script with realistic sample data (2 organizations, mixed events, edge cases)
- Production multi-stage Dockerfile (node:22-alpine)
- .dockerignore for optimized build context
- Shared test utilities (mongodb.helper.ts, e2e-app.factory.ts)

### Fixed
- Integration test timeouts via hookTimeout/serverSelectionTimeoutMS configuration
- E2e env crash: removed eager process.exit side effect from env.ts
- validate-env.ts throws Error instead of process.exit(1) for test compatibility

## [0.3.0] - 2026-02-24

### Added
- Registration domain entity with status tracking and soft delete
- RegisterForOccurrenceCommand with atomic capacity check and overlap detection in MongoDB transaction
- CancelRegistrationCommand with seat release and idempotent cancellation
- GetRegistrationsQuery with cursor-paginated read model
- RegistrationResolver with GraphQL union result types for typed error responses
- Partial unique index on (userId, occurrenceId) for duplicate prevention
- Overlap range query using denormalized dates on registration documents
- IEventModuleInProc and IOrganizationModuleInProc in-proc facades for cross-module communication
- DI tokens consolidated into MODULE_TOKENS objects per module
- Application barrel modules for handler registration

### Changed
- Event and Occurrence entities refactored to create/createNew/toJSON pattern with FakeDateProvider
- ApplicationModules converted to @Module decorators; feature module top-level files simplified
- GetRegistrationsHandler refactored to use REGISTRATION_REPOSITORY port (hexagonal compliant)
- DateProviderModule made global; CqrsProviderModule created for shared CQRS setup

### Fixed
- Domain error hygiene: all throw sites use BaseDomainError subclasses (no raw Error)
- OccurrenceNotFoundErrorType wired into GraphQL union; NotOrgMemberErrorType phantom removed
- recurrencePattern Zod schema accepts null for byMonthDay/byMonth/until (MongoDB null storage)
- verify-transaction.ts array destructuring for noUncheckedIndexedAccess compliance

## [0.2.0] - 2026-02-24

### Added
- Organization domain entity, Mongoose repository, and GraphQL resolver
- TenantGuard extended with organization slug resolution via CLS context
- Event domain entity with recurrence pattern value object (DAILY/WEEKLY/MONTHLY/YEARLY)
- Occurrence domain entity with registeredSeats counter
- materializeOccurrenceDates pure function using rrule library with MAX_OCCURRENCES guard
- CreateEvent, UpdateEvent, DeleteEvent commands with occurrence cascade
- GetEventsQuery and GetOccurrencesQuery with date range filtering
- EventResolver with GraphQL DTOs and module wiring
- Tenant-scoped Mongoose collections ({tenantSlug}_events, {tenantSlug}_occurrences)

## [0.1.0] - 2026-02-23

### Added
- Docker Compose with MongoDB 7.0 replica set and Redis 7-alpine (health checks)
- MongooseConfigModule with global connection from MONGODB_URI
- TenantConnectionRegistry for dynamic tenant-scoped Mongoose model resolution
- RedisModule with ioredis client and health check
- MongooseRepositoryBase with save/findById/delete/withTransaction and domain event publishing
- InMemoryRepositoryBase for unit test doubles
- GraphQL module (Mercurius + code-first schema at /graphql)
- TenantGuard validating x-tenant-id header with Zod
- Health module (GraphQL query returning MongoDB + Redis status)
- ClsModule for per-request correlationId propagation
- AppLogger with CLS-enriched structured logging (nestjs-pino)
- LoggingInterceptor supporting both HTTP and GraphQL contexts
- Environment validation via Zod schema

### Changed
- Removed Prisma ORM entirely (packages, generated client, source references)
- Removed Swagger/REST infrastructure (replaced by GraphQL)

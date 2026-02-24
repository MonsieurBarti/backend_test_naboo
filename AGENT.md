# AI Development Workflow

## Overview

This project was built entirely using Claude Code (Anthropic's AI coding agent) following a structured development methodology. Every feature went through a disciplined cycle: discuss requirements, research approaches, plan tasks, execute implementation, verify results. This document describes the workflow, tooling, and methodology used to build the platform.

The goal of this document is to demonstrate that AI was used deliberately as a structured development partner — not as a code autocomplete or a way to bypass architectural decisions.

## GSD Framework

Development followed the **GSD (Get Sh*t Done)** framework — a structured workflow for AI-assisted software development that replaces ad-hoc prompting with a repeatable methodology.

### Workflow Cycle

Each feature or subsystem went through five phases:

1. **Discuss** — Define scope with the AI. Establish constraints, edge cases, and non-goals. Produce `CONTEXT.md` capturing decisions made.
2. **Research** — AI analyzes the codebase, relevant libraries, and trade-offs. Produces `RESEARCH.md` with technical findings and planning implications.
3. **Plan** — AI generates `PLAN.md` files: executable task specifications containing enough specificity for the executor agent to implement without asking clarifying questions. Plans are prompts.
4. **Execute** — A dedicated executor agent reads the plan and implements tasks atomically. Each task produces a focused commit.
5. **Verify** — Automated and manual verification steps confirm the implementation matches the plan's success criteria.

### Artifacts per Phase

| Artifact | Content |
| --- | --- |
| `CONTEXT.md` | User decisions, implementation choices, deferred items |
| `RESEARCH.md` | Technical analysis, source material, planning implications |
| `PLAN.md` | Executable task specs with verification criteria and done conditions |
| `SUMMARY.md` | Completion report with deviations, decisions, and metrics |

Plans contain explicit done criteria per task (e.g., "command handler exists, raises `CapacityExceededError` when seats > max, integration test passes"). The executor agent commits each task individually and stops if it hits an ambiguity that would require a human decision — rather than guessing.

## Architecture Invariant Enforcement

A core feature of this workflow is that architectural constraints are codified as rule files the AI agent reads automatically — ensuring the code it generates conforms to the architecture, not just to "does it work."

### `.claude/CLAUDE.md`

The project-level instruction file defines global invariants enforced across every file:

- No `any` type in any form
- No TypeScript `enum` keyword (use `z.enum()` instead)
- No `as` type assertions (use generics, type guards, or `satisfies`)
- Zod-only validation (no `class-validator`, no `class-transformer`)
- `correlationId: string` required in every command/query props
- Commands never return data (`extends TypedCommand<void>`)
- Domain layer isolated from infrastructure and presentation imports
- Domain events published by the repository after DB write, not by handlers

### Per-layer Rule Files

Eleven rule files in `.claude/rules/` auto-load when the agent edits files in matching paths:

| Rule file | Applies to | Key constraints |
| --- | --- | --- |
| `api-typing.md` | All `.ts` files | No `any`, no `enum`, no `as`, strict TypeScript config |
| `api-cqrs-shared.md` | `*.command.ts`, `*.query.ts` | `props` naming, `correlationId`, `super()`, `execute({ props })` |
| `api-command.md` | `*.command.ts` | `extends TypedCommand<void>`, no data returned, no manual event publishing |
| `api-query.md` | `*.query.ts` | `extends TypedQuery<TResult>`, no mutations, inject PrismaService directly |
| `api-domain-entity.md` | `**/domain/**/*.ts` | Private constructor, factory method, Zod validation, no NestJS decorators |
| `api-infrastructure-repository.md` | `**/infrastructure/**/*.ts` | Implement domain interface, mapper pattern, no business logic |
| `api-domain-event.md` | `*.event.ts` | `extends DomainEvent`, immutable fields, no NestJS decorators |
| `api-event-handler.md` | `*.event-handler.ts` | `@EventsHandler` decorator, no HTTP logic, no manual event publishing |
| `api-presentation.md` | `**/presentation/**/*.ts` | `TypedCommandBus`/`TypedQueryBus`, `@CorrelationId()`, OpenAPI decorators |

These rules act as architectural contracts: the agent enforces strict constraints during code generation, producing code that follows the architecture — not just code that compiles.

## Tooling

### Code-Graph MCP Tools — [code-graph-ai](https://github.com/MonsieurBarti/code-graph-ai)

Four MCP (Model Context Protocol) tools replace grep/read for codebase navigation:

| Tool | Purpose |
| --- | --- |
| `find_symbol` | Locate a class, function, or type definition by name |
| `get_context` | Retrieve the full context of a symbol with its dependencies |
| `get_impact` | Understand the blast radius of a change — what else references this symbol |
| `find_references` | Trace all call sites and import locations for a symbol |

The agent uses these tools to understand the dependency graph before making changes. This prevents introducing circular dependencies, missing interface implementations, or breaking consumers of a modified API.

### NestJS Hexagonal Skills — [claude-nestjs-hexagonal](https://github.com/MonsieurBarti/claude-nestjs-hexagonal)

Pre-validated code templates for the hexagonal architecture pattern. Skills are invoked by the agent and instantiated with project-specific parameters:

| Skill | What it scaffolds |
| --- | --- |
| `/api-add-command` | Command + handler in one file, in-memory test, handler registration |
| `/api-add-query` | Query + handler + read model, integration test scaffold |
| `/api-add-event-handler` | Event handler class, test, registration in application module |
| `/api-add-domain-entity` | Entity + repository interface + builder (test-only) + in-memory repo |
| `/api-add-module` | Full 4-layer module scaffold (domain, application, infrastructure, presentation) |

Skills ensure generated code starts from the correct base — correct layer isolation, correct DI token patterns, correct test structure — before any project-specific logic is added.

## Development Metrics

| Metric | Value |
| --- | --- |
| Total phases | 5 (plus Phase 3.1 hardening and 6 quick tasks) |
| Plans executed | 19 (across all phases and quick tasks) |
| Total commits | 58 |
| Development timeline | 2026-02-23 to 2026-02-24 (2 days) |
| Average plan execution | 2-3 tasks, 5-10 minutes |

## Phase Summary

| Phase | Focus | Plans | Key Deliverables |
| --- | --- | --- | --- |
| 1 — Shared Infrastructure | Framework bootstrap | 4 | Docker Compose, MongooseConfigModule, TenantConnectionRegistry, RedisModule, ClsService, TenantGuard, GraphQL module, health check |
| 2 — Organization + Event Modules | Core domain | 4 | Organization CRUD, Event domain with recurrence pattern, occurrence materialization, UpdateEvent/DeleteEvent with propagation, GetEvents/GetOccurrences with pagination |
| 3 — Registration Module | Capacity + conflicts | 3 | Registration domain, RegisterForOccurrence (atomic transaction), CancelRegistration, GetRegistrations |
| 3.1 — Hardening | Code quality | 2 | Domain error hygiene, GraphQL union corrections, TypeScript noUncheckedIndexedAccess fixes |
| 4 — Caching, Tests, Seeding | Observability + quality | 6 | 5 domain event handlers, read-through cache for all list queries, unit tests for all command handlers, integration tests for query handlers, e2e tests, seed script, Dockerfile |
| 5 — Documentation | Evaluator artifacts | 2 | ARCHITECTURE.md, README.md, CHANGELOG.md, AGENT.md |

Quick tasks addressed emergent correctness issues between phases: DI token consolidation, module decoupling via in-proc facades, recurrence pattern null handling, and TypeScript strict mode fixes.

## Commit History

The commit history reflects real incremental delivery. Each plan produces 1-3 commits following conventional commit format (`feat`, `fix`, `test`, `refactor`, `chore`). Commits are scoped to the phase and plan that produced them (e.g., `feat(02-02): implement occurrence materializer`).

No commits were squashed. The evaluator can trace the full development process through `git log --oneline` — from initial infrastructure bootstrap through domain implementation, registration concurrency handling, cache layering, and test coverage. Each commit represents a discrete, verifiable unit of work.

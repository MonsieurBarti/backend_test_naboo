# **Senior Backend Engineer Technical Test**

## **Context**

You are building the backend for a **multi-tenant event scheduling platform**. Organizations can create events, and users within those organizations can register for events. The system must enforce strict data isolation between tenants.

## **Requirements**

**Core Features**

1. **Organization Management** - Create and manage organizations (tenants)
2. **Event Management** - CRUD operations for events scoped to an organization
3. **Registration System** - Users can register for events within their organization
4. **Capacity Management** - Events have a maximum capacity; registrations must respect this limit with proper concurrency handling
5. **Recurring Events** - Events can repeat on a schedule (daily, weekly, monthly, or custom pattern). A registration applies to a single occurrence of a recurring event. Design the schema and query patterns to efficiently handle both write operations and read queries like "get all occurrences for the next 30 days."
6. **Conflict Detection** - A user cannot register for time-overlapping events. This constraint must be enforced atomically at the database level, not just in application code.

**Technical Constraints**

- **Stack**: NestJS, GraphQL (code-first), MongoDB (with Mongoose)
- **Node.js**: LTS version
- **Multi-tenancy**: Implement tenant isolation at the data layer (document your chosen strategy)
- **Concurrency**: Handle race conditions for both capacity limits and conflict detection
- **Validation**: Implement proper input validation and error handling

**Minimum API Surface**

Your GraphQL API should support at minimum: querying events and their occurrences within a date range, registering for an event or occurrence, canceling a registration, and viewing a user's registrations.

**Evaluation Criteria**

- Architecture decisions and code organization
- Database design and data modeling
- Error handling and edge cases
- Code quality and maintainability
- Documentation clarity
- Logging strategy and implementation (levels, context, request tracing)
- Security best practices (input validation, secrets management, common vulnerabilities protection)
- Test coverage and quality (any type: unit, integration, e2e, or any other appropriate testing approach)
- Dockerfile optimization and best practices (multi-stage builds, layers, image size, security)
- Caching strategy and implementation (cache invalidation, performance optimization, data consistency)
- AI integration and development workflow ([AGENT.md](http://AGENT.md), agent skills, documentation for AI assistants)

## **Deliverables**

**1. GitHub Repository containing:**

- Working NestJS application with Docker Compose setup (app + MongoDB)
- [README.md](http://README.md) with setup and run instructions, including technical justifications for all implementation choices made throughout the project. If you did not have time to complete certain features or improvements, explain what solutions you would have implemented given more time.
- Database seeding mechanism to facilitate testing with sample data (organizations, events, registrations)
- CHANGELOG.md following Keep a Changelog format
- Adequate test coverage
- **Commit history must reflect real, atomic work throughout the test period. Do not squash commits. We will review your commit history to understand your development process and decision-making over time.**

**2. ARCHITECTURE.md with the following sections:**

**a) Overview** - High-level description of your solution

**b) Schema Design** - Your MongoDB collections and document structures

**c) Alternatives Considered**

(Critical) - For each major decision below, describe at least 2 different approaches you evaluated and explain why you chose one over the others:

- Multi-tenancy strategy
- Recurring events storage
- Conflict detection mechanism
- Capacity enforcement approach

**d) Trade-offs** - What limitations does your solution have? What would you change with more time?

## **Submission**

**Timeline**: 2 to 3 days

Send the repository link to benoit.dambreville@naboo.app before your technical interview. For any questions, use the same email.

---

## **Notes**

- Focus on demonstrating your architectural thinking, not feature completeness
- We value well-reasoned decisions over "correct" answers
- The interview will include questions about your implementation choices and potential modifications

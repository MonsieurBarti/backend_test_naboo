# GraphQL Examples

Sample queries and mutations to test the API after seeding data (`pnpm seed`).

> **Playground:** [http://localhost:3000/graphiql](http://localhost:3000/graphiql)

## Prerequisites

1. Run `pnpm seed` — this creates two organizations, events, occurrences, and registrations
2. The seed output prints organization UUIDs — copy the **Busy Corp** UUID
3. Set the `x-tenant-id` header in the GraphQL playground's "Headers" panel:

```json
{
  "x-tenant-id": "<paste Busy Corp UUID here>"
}
```

> **Tip:** Queries marked with `@Public()` (health, organization) do **not** require the `x-tenant-id` header. All other operations do.

---

## Health Check

No headers required.

```graphql
query Health {
  health {
    status
    mongodb
    redis
  }
}
```

---

## Organizations

### Look up the seeded organization (no header required)

```graphql
query GetOrganization {
  organization(slug: "busy-corp") {
    id
    name
    slug
    createdAt
  }
}
```

### Create a new organization (no header required)

```graphql
mutation CreateOrganization {
  createOrganization(input: { name: "My New Org" }) {
    ... on CreateOrganizationSuccess {
      id
      name
      slug
    }
    ... on SlugAlreadyTakenErrorType {
      message
      slug
    }
  }
}
```

---

## Events

> All event operations require the `x-tenant-id` header.

### List all events

```graphql
query ListEvents {
  events(first: 10) {
    totalCount
    hasNextPage
    nodes {
      id
      title
      description
      location
      startDate
      endDate
      maxCapacity
      isRecurring
    }
    edges {
      cursor
      node {
        id
        title
      }
    }
  }
}
```

### List events with date filter

```graphql
query ListEventsFiltered {
  events(
    startDate: "2026-03-01T00:00:00Z"
    endDate: "2026-07-01T00:00:00Z"
    first: 5
  ) {
    totalCount
    nodes {
      id
      title
      startDate
      endDate
      isRecurring
    }
  }
}
```

### Paginate with cursor

Use the `cursor` value from a previous response's `edges`:

```graphql
query NextPage {
  events(first: 2, after: "<paste cursor here>") {
    hasNextPage
    edges {
      cursor
      node {
        id
        title
      }
    }
  }
}
```

### Create a one-off event

```graphql
mutation CreateOneOffEvent {
  createEvent(
    input: {
      title: "Team Lunch"
      description: "Quarterly team lunch at the Italian place"
      location: "Ristorante Roma"
      startDate: "2026-07-01T12:00:00Z"
      endDate: "2026-07-01T13:30:00Z"
      maxCapacity: 25
    }
  ) {
    ... on CreateEventSuccess {
      id
      title
    }
    ... on InvalidRecurrencePatternErrorType {
      message
    }
  }
}
```

### Create a recurring event (weekly on Tuesday and Thursday)

```graphql
mutation CreateRecurringEvent {
  createEvent(
    input: {
      title: "Yoga Session"
      description: "Office yoga — bring your own mat"
      location: "Rooftop Terrace"
      startDate: "2026-04-07T07:00:00Z"
      endDate: "2026-04-07T08:00:00Z"
      maxCapacity: 15
      recurrencePattern: {
        frequency: "WEEKLY"
        interval: 1
        byDay: ["TU", "TH"]
        until: "2026-06-30T00:00:00Z"
      }
    }
  ) {
    ... on CreateEventSuccess {
      id
      title
    }
    ... on InvalidRecurrencePatternErrorType {
      message
    }
  }
}
```

### Update an event

Replace `<eventId>` with an ID from the `events` query:

```graphql
mutation UpdateEvent {
  updateEvent(
    input: {
      eventId: "<eventId>"
      title: "Updated Title"
      maxCapacity: 100
    }
  ) {
    ... on UpdateEventSuccess {
      id
      title
    }
    ... on EventNotFoundErrorType {
      message
      eventId
    }
    ... on InvalidRecurrencePatternErrorType {
      message
    }
  }
}
```

### Delete an event

```graphql
mutation DeleteEvent {
  deleteEvent(input: { eventId: "<eventId>" }) {
    ... on DeleteEventSuccess {
      id
    }
    ... on EventNotFoundErrorType {
      message
      eventId
    }
  }
}
```

---

## Occurrences

### List occurrences for an event

Replace `<eventId>` with an ID from the `events` query:

```graphql
query ListOccurrences {
  occurrences(eventId: "<eventId>", first: 10) {
    totalCount
    hasNextPage
    nodes {
      id
      eventId
      startDate
      endDate
      title
      location
      maxCapacity
    }
  }
}
```

### Filter occurrences by date range

```graphql
query OccurrencesInRange {
  occurrences(
    eventId: "<eventId>"
    startDate: "2026-03-01T00:00:00Z"
    endDate: "2026-05-01T00:00:00Z"
  ) {
    totalCount
    nodes {
      id
      startDate
      endDate
    }
  }
}
```

---

## Registrations

### Register for an occurrence

Replace `<occurrenceId>` with an ID from the `occurrences` query:

```graphql
mutation Register {
  registerForOccurrence(
    input: {
      occurrenceId: "<occurrenceId>"
      userId: "user-123"
      seatCount: 1
    }
  ) {
    ... on RegisterForOccurrenceSuccess {
      registrationId
      occurrenceId
      userId
      seatCount
    }
    ... on CapacityExceededErrorType {
      message
      occurrenceId
    }
    ... on ConflictDetectedErrorType {
      message
      conflictingOccurrenceId
      eventTitle
      startDate
      endDate
    }
    ... on AlreadyRegisteredErrorType {
      message
      userId
      occurrenceId
    }
    ... on OccurrenceInPastErrorType {
      message
      occurrenceId
    }
    ... on EventCancelledErrorType {
      message
      occurrenceId
    }
    ... on OccurrenceNotFoundErrorType {
      message
      occurrenceId
    }
  }
}
```

### List registrations for a user

```graphql
query UserRegistrations {
  registrations(userId: "user-123", first: 10) {
    totalCount
    hasNextPage
    nodes {
      id
      occurrenceId
      userId
      seatCount
      status
      eventTitle
      occurrenceStartDate
      occurrenceEndDate
    }
  }
}
```

### List registrations including cancelled

```graphql
query AllRegistrations {
  registrations(userId: "user-123", includeCancelled: true, first: 20) {
    totalCount
    nodes {
      id
      status
      eventTitle
      seatCount
    }
  }
}
```

### Cancel a registration

```graphql
mutation CancelRegistration {
  cancelRegistration(input: { registrationId: "<registrationId>" }) {
    ... on CancelRegistrationSuccess {
      registrationId
      cancelled
    }
    ... on RegistrationNotFoundErrorType {
      message
      registrationId
    }
  }
}
```

### Reduce seat count (partial cancellation)

```graphql
mutation ReduceSeats {
  cancelRegistration(
    input: { registrationId: "<registrationId>", newSeatCount: 1 }
  ) {
    ... on CancelRegistrationSuccess {
      registrationId
      cancelled
    }
    ... on RegistrationNotFoundErrorType {
      message
      registrationId
    }
  }
}
```

---

## Typical Test Flow

A complete walkthrough using seed data:

```
1. Run `pnpm seed` and note the Busy Corp organization UUID
2. Set header: x-tenant-id: <org-uuid>
3. Query `events` → pick an event ID (e.g. "Monday Standup")
4. Query `occurrences(eventId: ...)` → pick a future occurrence ID
5. Mutate `registerForOccurrence(occurrenceId: ..., userId: "test-user")`
6. Query `registrations(userId: "test-user")` → verify it appears
7. Mutate `cancelRegistration(registrationId: ...)` → cancel it
8. Query `registrations(userId: "test-user", includeCancelled: true)` → verify status
```

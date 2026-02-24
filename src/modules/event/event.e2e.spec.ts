import { randomUUID } from "node:crypto";
import type Redis from "ioredis";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TestApp } from "../../shared/testing/e2e-app.factory";
import { createTestApp, gqlRequest } from "../../shared/testing/e2e-app.factory";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(obj: Record<string, unknown>, key: string): string {
  return typeof obj[key] === "string" ? String(obj[key]) : "";
}

describe("Event (e2e)", () => {
  let testApp: TestApp;
  let tenantId: string;
  let redisClient: Redis;

  beforeAll(async () => {
    testApp = await createTestApp();
    redisClient = testApp.redisClient;

    // Create an organization for the tenant
    const mutation = `
      mutation CreateOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          ... on CreateOrganizationSuccess {
            id
            slug
          }
        }
      }
    `;
    const orgName = `Event Test Org ${randomUUID().slice(0, 8)}`;
    const response = await gqlRequest(testApp.app, mutation, { input: { name: orgName } });
    const org = response.data.createOrganization;
    expect(isRecord(org)).toBe(true);
    if (!isRecord(org)) return;
    tenantId = getString(org, "id");
    expect(tenantId).toBeTruthy();
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  const createEventMutation = `
    mutation CreateEvent($input: CreateEventInput!) {
      createEvent(input: $input) {
        ... on CreateEventSuccess {
          id
          title
        }
        ... on InvalidRecurrencePatternErrorType {
          message
        }
      }
    }
  `;

  const eventsQuery = `
    query Events($startDate: DateTime, $endDate: DateTime, $first: Int) {
      events(startDate: $startDate, endDate: $endDate, first: $first) {
        nodes {
          id
          title
          isRecurring
          maxCapacity
        }
        totalCount
        hasNextPage
      }
    }
  `;

  const occurrencesQuery = `
    query Occurrences($eventId: String!, $first: Int) {
      occurrences(eventId: $eventId, first: $first) {
        nodes {
          id
          eventId
          startDate
          endDate
        }
        totalCount
      }
    }
  `;

  it("should create a non-recurring event", async () => {
    const input = {
      title: "Single Event",
      description: "A one-off event",
      location: null,
      startDate: new Date("2025-06-15T10:00:00").toISOString(),
      endDate: new Date("2025-06-15T12:00:00").toISOString(),
      maxCapacity: 50,
      recurrencePattern: null,
    };

    const response = await gqlRequest(
      testApp.app,
      createEventMutation,
      { input },
      {
        "x-tenant-id": tenantId,
      },
    );

    expect(response.errors).toBeUndefined();
    const result = response.data.createEvent;
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;
    // Must be CreateEventSuccess (has id)
    expect(typeof result.id).toBe("string");
    expect(getString(result, "id")).toBeTruthy();
  });

  it("should create a recurring weekly event and have occurrences", async () => {
    const input = {
      title: "Weekly Standup",
      description: "Weekly sync",
      location: "Conference Room A",
      startDate: new Date("2025-07-01T09:00:00").toISOString(),
      endDate: new Date("2025-07-01T09:30:00").toISOString(),
      maxCapacity: 20,
      recurrencePattern: {
        frequency: "WEEKLY",
        interval: 1,
        byDay: ["TU"],
        byMonthDay: null,
        byMonth: null,
        until: null,
        count: 4,
      },
    };

    const createResponse = await gqlRequest(
      testApp.app,
      createEventMutation,
      { input },
      {
        "x-tenant-id": tenantId,
      },
    );

    expect(createResponse.errors).toBeUndefined();
    const createResult = createResponse.data.createEvent;
    expect(isRecord(createResult)).toBe(true);
    if (!isRecord(createResult)) return;
    const eventId = getString(createResult, "id");
    expect(eventId).toBeTruthy();

    // Query occurrences — should have 4 (count=4)
    const occResponse = await gqlRequest(
      testApp.app,
      occurrencesQuery,
      { eventId, first: 20 },
      {
        "x-tenant-id": tenantId,
      },
    );

    expect(occResponse.errors).toBeUndefined();
    const occResult = occResponse.data.occurrences;
    expect(isRecord(occResult)).toBe(true);
    if (!isRecord(occResult)) return;
    expect(typeof occResult.totalCount === "number" && occResult.totalCount > 0).toBe(true);
  });

  it("should query events with date filter", async () => {
    // Create two events at different dates
    const juneName = `June Event ${randomUUID().slice(0, 6)}`;
    const decemberName = `December Event ${randomUUID().slice(0, 6)}`;

    await gqlRequest(
      testApp.app,
      createEventMutation,
      {
        input: {
          title: juneName,
          description: "In June",
          location: null,
          startDate: new Date("2025-06-20T10:00:00").toISOString(),
          endDate: new Date("2025-06-20T12:00:00").toISOString(),
          maxCapacity: 10,
          recurrencePattern: null,
        },
      },
      { "x-tenant-id": tenantId },
    );

    await gqlRequest(
      testApp.app,
      createEventMutation,
      {
        input: {
          title: decemberName,
          description: "In December",
          location: null,
          startDate: new Date("2025-12-20T10:00:00").toISOString(),
          endDate: new Date("2025-12-20T12:00:00").toISOString(),
          maxCapacity: 10,
          recurrencePattern: null,
        },
      },
      { "x-tenant-id": tenantId },
    );

    // Query with date filter — only June
    const response = await gqlRequest(
      testApp.app,
      eventsQuery,
      {
        startDate: new Date("2025-06-01").toISOString(),
        endDate: new Date("2025-06-30").toISOString(),
        first: 20,
      },
      { "x-tenant-id": tenantId },
    );

    expect(response.errors).toBeUndefined();
    const result = response.data.events;
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;
    const nodes = Array.isArray(result.nodes) ? result.nodes : [];
    const titles = nodes.map((n) => (isRecord(n) ? getString(n, "title") : ""));
    expect(titles).toContain(juneName);
    expect(titles).not.toContain(decemberName);
  });

  it("should update an event", async () => {
    const createInput = {
      title: "Original Title",
      description: "Original description",
      location: null,
      startDate: new Date("2025-08-10T10:00:00").toISOString(),
      endDate: new Date("2025-08-10T12:00:00").toISOString(),
      maxCapacity: 25,
      recurrencePattern: null,
    };

    const createResponse = await gqlRequest(
      testApp.app,
      createEventMutation,
      { input: createInput },
      { "x-tenant-id": tenantId },
    );
    const created = createResponse.data.createEvent;
    expect(isRecord(created)).toBe(true);
    if (!isRecord(created)) return;
    const eventId = getString(created, "id");

    const updateMutation = `
      mutation UpdateEvent($input: UpdateEventInput!) {
        updateEvent(input: $input) {
          ... on UpdateEventSuccess {
            id
            title
          }
          ... on EventNotFoundErrorType {
            message
            eventId
          }
        }
      }
    `;

    const updateResponse = await gqlRequest(
      testApp.app,
      updateMutation,
      {
        input: {
          eventId,
          title: "Updated Title",
          description: null,
          location: null,
          startDate: null,
          endDate: null,
          maxCapacity: null,
          recurrencePattern: null,
        },
      },
      { "x-tenant-id": tenantId },
    );

    expect(updateResponse.errors).toBeUndefined();
    const updateResult = updateResponse.data.updateEvent;
    expect(isRecord(updateResult)).toBe(true);
    if (!isRecord(updateResult)) return;
    expect(typeof updateResult.id).toBe("string");
  });

  it("should delete an event", async () => {
    const createInput = {
      title: "To Be Deleted",
      description: "Will be deleted",
      location: null,
      startDate: new Date("2025-09-10T10:00:00").toISOString(),
      endDate: new Date("2025-09-10T12:00:00").toISOString(),
      maxCapacity: 10,
      recurrencePattern: null,
    };

    const createResponse = await gqlRequest(
      testApp.app,
      createEventMutation,
      { input: createInput },
      { "x-tenant-id": tenantId },
    );
    const created = createResponse.data.createEvent;
    expect(isRecord(created)).toBe(true);
    if (!isRecord(created)) return;
    const eventId = getString(created, "id");

    const deleteMutation = `
      mutation DeleteEvent($input: DeleteEventInput!) {
        deleteEvent(input: $input) {
          ... on DeleteEventSuccess {
            id
          }
          ... on EventNotFoundErrorType {
            message
            eventId
          }
        }
      }
    `;

    const deleteResponse = await gqlRequest(
      testApp.app,
      deleteMutation,
      { input: { eventId } },
      { "x-tenant-id": tenantId },
    );

    expect(deleteResponse.errors).toBeUndefined();
    const deleteResult = deleteResponse.data.deleteEvent;
    expect(isRecord(deleteResult)).toBe(true);
    if (!isRecord(deleteResult)) return;
    expect(deleteResult.id).toBe(eventId);
  });

  it("should invalidate cache on event mutation (cache behavior test)", async () => {
    // Step 1: Query events to populate cache
    const firstQuery = await gqlRequest(
      testApp.app,
      eventsQuery,
      { first: 100 },
      { "x-tenant-id": tenantId },
    );
    expect(firstQuery.errors).toBeUndefined();
    const firstResult = firstQuery.data.events;
    expect(isRecord(firstResult)).toBe(true);
    if (!isRecord(firstResult)) return;
    const initialCount = typeof firstResult.totalCount === "number" ? firstResult.totalCount : 0;

    // Verify cache is populated (Redis should have a key for this tenant's events list)
    const keysAfterFirstQuery = await redisClient.keys(`${tenantId}:events:list:*`);
    expect(keysAfterFirstQuery.length).toBeGreaterThan(0);

    // Step 2: Create a new event (triggers EventCreatedEvent -> InvalidateCacheWhenEventCreated)
    const newEventTitle = `Cache Test Event ${randomUUID().slice(0, 8)}`;
    const createResponse = await gqlRequest(
      testApp.app,
      createEventMutation,
      {
        input: {
          title: newEventTitle,
          description: "Cache invalidation test event",
          location: null,
          startDate: new Date("2025-10-15T10:00:00").toISOString(),
          endDate: new Date("2025-10-15T12:00:00").toISOString(),
          maxCapacity: 30,
          recurrencePattern: null,
        },
      },
      { "x-tenant-id": tenantId },
    );
    expect(createResponse.errors).toBeUndefined();

    // Small delay to allow event handler to run
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Verify cache keys are gone (invalidated)
    const keysAfterMutation = await redisClient.keys(`${tenantId}:events:list:*`);
    expect(keysAfterMutation.length).toBe(0);

    // Step 3: Query again — should fetch fresh data and include the new event
    const secondQuery = await gqlRequest(
      testApp.app,
      eventsQuery,
      { first: 100 },
      { "x-tenant-id": tenantId },
    );
    expect(secondQuery.errors).toBeUndefined();
    const secondResult = secondQuery.data.events;
    expect(isRecord(secondResult)).toBe(true);
    if (!isRecord(secondResult)) return;
    const newCount = typeof secondResult.totalCount === "number" ? secondResult.totalCount : 0;

    expect(newCount).toBeGreaterThan(initialCount);
    const nodes = Array.isArray(secondResult.nodes) ? secondResult.nodes : [];
    const titles = nodes.map((n) => (isRecord(n) ? getString(n, "title") : ""));
    expect(titles).toContain(newEventTitle);
  });
});

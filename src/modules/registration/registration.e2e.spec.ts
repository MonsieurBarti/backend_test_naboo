import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TestApp } from "../../shared/testing/e2e-app.factory";
import { createTestApp, gqlRequest } from "../../shared/testing/e2e-app.factory";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(obj: Record<string, unknown>, key: string): string {
  return typeof obj[key] === "string" ? String(obj[key]) : "";
}

describe("Registration (e2e)", () => {
  let testApp: TestApp;
  let tenantId: string;

  // IDs for the seed event+occurrence used in registration tests
  let seedOccurrenceId: string;

  // IDs for the capacity=1 occurrence used in concurrency tests
  let limitedOccurrenceId: string;

  // A future date offset by N days from now
  const futureISODate = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setUTCHours(10, 0, 0, 0);
    return d.toISOString();
  };

  const futureISODateEnd = (offsetDays: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    d.setUTCHours(14, 0, 0, 0);
    return d.toISOString();
  };

  const createEventMutation = `
    mutation CreateEvent($input: CreateEventInput!) {
      createEvent(input: $input) {
        ... on CreateEventSuccess {
          id
          title
        }
      }
    }
  `;

  const occurrencesQuery = `
    query Occurrences($eventId: String!, $first: Int) {
      occurrences(eventId: $eventId, first: $first) {
        nodes { id }
      }
    }
  `;

  const registerMutation = `
    mutation RegisterForOccurrence($input: RegisterForOccurrenceInput!) {
      registerForOccurrence(input: $input) {
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
        }
        ... on AlreadyRegisteredErrorType {
          message
        }
        ... on OccurrenceInPastErrorType {
          message
        }
        ... on OccurrenceNotFoundErrorType {
          message
        }
        ... on EventCancelledErrorType {
          message
        }
      }
    }
  `;

  const cancelMutation = `
    mutation CancelRegistration($input: CancelRegistrationInput!) {
      cancelRegistration(input: $input) {
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
  `;

  const registrationsQuery = `
    query Registrations($userId: String!, $includeCancelled: Boolean, $first: Int) {
      registrations(userId: $userId, includeCancelled: $includeCancelled, first: $first) {
        nodes {
          id
          userId
          occurrenceId
          status
          seatCount
        }
        totalCount
        hasNextPage
      }
    }
  `;

  beforeAll(async () => {
    testApp = await createTestApp();

    // Create organization
    const orgMutation = `
      mutation CreateOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          ... on CreateOrganizationSuccess {
            id
            slug
          }
        }
      }
    `;
    const orgName = `Reg Test Org ${randomUUID().slice(0, 8)}`;
    const orgResponse = await gqlRequest(testApp.app, orgMutation, {
      input: { name: orgName },
    });
    const org = orgResponse.data.createOrganization;
    expect(isRecord(org)).toBe(true);
    if (!isRecord(org)) return;
    tenantId = getString(org, "id");
    expect(tenantId).toBeTruthy();

    // Create seed event with recurring pattern to get occurrences (large capacity)
    const createResponse = await gqlRequest(
      testApp.app,
      createEventMutation,
      {
        input: {
          title: "Registration Test Event",
          description: "For registration e2e tests",
          location: null,
          startDate: futureISODate(30),
          endDate: futureISODateEnd(30),
          maxCapacity: 100,
          recurrencePattern: {
            frequency: "WEEKLY",
            interval: 1,
            byDay: ["MO"],
            byMonthDay: null,
            byMonth: null,
            until: null,
            count: 3,
          },
        },
      },
      { "x-tenant-id": tenantId },
    );

    const event = createResponse.data.createEvent;
    expect(isRecord(event)).toBe(true);
    if (!isRecord(event)) return;
    const seedEventId = getString(event, "id");
    expect(seedEventId).toBeTruthy();

    // Query occurrences to get an occurrence ID
    const occResponse = await gqlRequest(
      testApp.app,
      occurrencesQuery,
      { eventId: seedEventId, first: 10 },
      { "x-tenant-id": tenantId },
    );
    const occResult = occResponse.data.occurrences;
    expect(isRecord(occResult)).toBe(true);
    if (!isRecord(occResult)) return;
    const occNodes = Array.isArray(occResult.nodes) ? occResult.nodes : [];
    expect(occNodes.length).toBeGreaterThan(0);
    const firstOcc = occNodes[0];
    expect(isRecord(firstOcc)).toBe(true);
    if (!isRecord(firstOcc)) return;
    seedOccurrenceId = getString(firstOcc, "id");

    // Create limited-capacity event for concurrency test (capacity=1)
    const limitedEventResponse = await gqlRequest(
      testApp.app,
      createEventMutation,
      {
        input: {
          title: "Limited Capacity Event",
          description: "Capacity=1 concurrency test",
          location: null,
          startDate: futureISODate(60),
          endDate: futureISODateEnd(60),
          maxCapacity: 1,
          recurrencePattern: {
            frequency: "WEEKLY",
            interval: 1,
            byDay: ["WE"],
            byMonthDay: null,
            byMonth: null,
            until: null,
            count: 1,
          },
        },
      },
      { "x-tenant-id": tenantId },
    );
    const limitedEvent = limitedEventResponse.data.createEvent;
    expect(isRecord(limitedEvent)).toBe(true);
    if (!isRecord(limitedEvent)) return;
    const limitedEventId = getString(limitedEvent, "id");
    expect(limitedEventId).toBeTruthy();

    const limitedOccResponse = await gqlRequest(
      testApp.app,
      occurrencesQuery,
      { eventId: limitedEventId, first: 5 },
      { "x-tenant-id": tenantId },
    );
    const limitedOccResult = limitedOccResponse.data.occurrences;
    expect(isRecord(limitedOccResult)).toBe(true);
    if (!isRecord(limitedOccResult)) return;
    const limitedOccNodes = Array.isArray(limitedOccResult.nodes) ? limitedOccResult.nodes : [];
    expect(limitedOccNodes.length).toBeGreaterThan(0);
    const firstLimitedOcc = limitedOccNodes[0];
    expect(isRecord(firstLimitedOcc)).toBe(true);
    if (!isRecord(firstLimitedOcc)) return;
    limitedOccurrenceId = getString(firstLimitedOcc, "id");
  });

  afterAll(async () => {
    await testApp.app.close();
  });

  it("should register for an occurrence", async () => {
    const userId = randomUUID();

    const response = await gqlRequest(
      testApp.app,
      registerMutation,
      {
        input: {
          occurrenceId: seedOccurrenceId,
          userId,
          seatCount: 1,
        },
      },
      { "x-tenant-id": tenantId },
    );

    expect(response.errors).toBeUndefined();
    const result = response.data.registerForOccurrence;
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;
    expect(typeof result.registrationId).toBe("string");
    expect(getString(result, "registrationId")).toBeTruthy();
  });

  it("should cancel a registration", async () => {
    const userId = randomUUID();

    // Register first
    const registerResponse = await gqlRequest(
      testApp.app,
      registerMutation,
      {
        input: { occurrenceId: seedOccurrenceId, userId, seatCount: 1 },
      },
      { "x-tenant-id": tenantId },
    );
    const registered = registerResponse.data.registerForOccurrence;
    expect(isRecord(registered)).toBe(true);
    if (!isRecord(registered)) return;
    const registrationId = getString(registered, "registrationId");
    expect(registrationId).toBeTruthy();

    // Cancel
    const cancelResponse = await gqlRequest(
      testApp.app,
      cancelMutation,
      { input: { registrationId, newSeatCount: null } },
      { "x-tenant-id": tenantId },
    );

    expect(cancelResponse.errors).toBeUndefined();
    const cancelResult = cancelResponse.data.cancelRegistration;
    expect(isRecord(cancelResult)).toBe(true);
    if (!isRecord(cancelResult)) return;
    expect(cancelResult.cancelled).toBe(true);
  });

  it("should query registrations for a user", async () => {
    const userId = randomUUID();

    // Register once
    await gqlRequest(
      testApp.app,
      registerMutation,
      { input: { occurrenceId: seedOccurrenceId, userId, seatCount: 1 } },
      { "x-tenant-id": tenantId },
    );

    const response = await gqlRequest(
      testApp.app,
      registrationsQuery,
      { userId, first: 20 },
      { "x-tenant-id": tenantId },
    );

    expect(response.errors).toBeUndefined();
    const result = response.data.registrations;
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;
    expect(typeof result.totalCount === "number" && result.totalCount >= 1).toBe(true);
    const nodes = Array.isArray(result.nodes) ? result.nodes : [];
    for (const node of nodes) {
      if (isRecord(node)) {
        expect(node.userId).toBe(userId);
      }
    }
  });

  it("should reject registration when capacity is exceeded", async () => {
    // Register user1 first (capacity=1)
    const userId1 = randomUUID();
    const registerResponse = await gqlRequest(
      testApp.app,
      registerMutation,
      { input: { occurrenceId: limitedOccurrenceId, userId: userId1, seatCount: 1 } },
      { "x-tenant-id": tenantId },
    );
    const result1 = registerResponse.data.registerForOccurrence;
    expect(isRecord(result1)).toBe(true);
    if (!isRecord(result1)) return;
    expect(typeof result1.registrationId).toBe("string");

    // Try to register user2 — should fail with CapacityExceededError
    const userId2 = randomUUID();
    const rejectResponse = await gqlRequest(
      testApp.app,
      registerMutation,
      { input: { occurrenceId: limitedOccurrenceId, userId: userId2, seatCount: 1 } },
      { "x-tenant-id": tenantId },
    );
    const result2 = rejectResponse.data.registerForOccurrence;
    expect(isRecord(result2)).toBe(true);
    if (!isRecord(result2)) return;
    // Should be CapacityExceededErrorType (has occurrenceId but not registrationId)
    expect(typeof result2.registrationId).not.toBe("string");
    expect(typeof result2.message).toBe("string");
    expect(typeof result2.occurrenceId).toBe("string");
  });

  it("should reject already-registered attempt for same user", async () => {
    const userId = randomUUID();

    // Register for seedOccurrenceId first
    await gqlRequest(
      testApp.app,
      registerMutation,
      { input: { occurrenceId: seedOccurrenceId, userId, seatCount: 1 } },
      { "x-tenant-id": tenantId },
    );

    // Try to register for the same occurrence again — should be AlreadyRegistered
    const response = await gqlRequest(
      testApp.app,
      registerMutation,
      { input: { occurrenceId: seedOccurrenceId, userId, seatCount: 1 } },
      { "x-tenant-id": tenantId },
    );

    const result = response.data.registerForOccurrence;
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;
    // Should be AlreadyRegisteredErrorType (has message but not registrationId)
    expect(typeof result.message).toBe("string");
    expect(typeof result.registrationId).not.toBe("string");
  });

  it("should atomically enforce capacity under concurrent requests (concurrency test)", async () => {
    // Create a fresh capacity=1 occurrence for this test
    const concurrencyEventResponse = await gqlRequest(
      testApp.app,
      createEventMutation,
      {
        input: {
          title: "Concurrency Test Event",
          description: "Testing atomic capacity enforcement",
          location: null,
          startDate: futureISODate(90),
          endDate: futureISODateEnd(90),
          maxCapacity: 1,
          recurrencePattern: {
            frequency: "WEEKLY",
            interval: 1,
            byDay: ["TH"],
            byMonthDay: null,
            byMonth: null,
            until: null,
            count: 1,
          },
        },
      },
      { "x-tenant-id": tenantId },
    );
    const concurrencyEvent = concurrencyEventResponse.data.createEvent;
    expect(isRecord(concurrencyEvent)).toBe(true);
    if (!isRecord(concurrencyEvent)) return;
    const concurrencyEventId = getString(concurrencyEvent, "id");

    const concurrencyOccResponse = await gqlRequest(
      testApp.app,
      occurrencesQuery,
      { eventId: concurrencyEventId, first: 5 },
      { "x-tenant-id": tenantId },
    );
    const concurrencyOccResult = concurrencyOccResponse.data.occurrences;
    expect(isRecord(concurrencyOccResult)).toBe(true);
    if (!isRecord(concurrencyOccResult)) return;
    const nodes = Array.isArray(concurrencyOccResult.nodes) ? concurrencyOccResult.nodes : [];
    const firstNode = nodes[0];
    expect(isRecord(firstNode)).toBe(true);
    if (!isRecord(firstNode)) return;
    const concurrencyOccurrenceId = getString(firstNode, "id");
    expect(concurrencyOccurrenceId).toBeTruthy();

    // Send N concurrent registration requests from different users
    const N = 5;
    const userIds = Array.from({ length: N }, () => randomUUID());

    const results = await Promise.allSettled(
      userIds.map((userId) =>
        gqlRequest(
          testApp.app,
          registerMutation,
          { input: { occurrenceId: concurrencyOccurrenceId, userId, seatCount: 1 } },
          { "x-tenant-id": tenantId },
        ),
      ),
    );

    // All HTTP calls should resolve (no network errors)
    for (const r of results) {
      expect(r.status).toBe("fulfilled");
    }

    // Categorize GraphQL results
    const gqlResults = results.map((r) => {
      if (r.status === "fulfilled") {
        return r.value.data.registerForOccurrence;
      }
      return undefined;
    });

    const successes = gqlResults.filter((r) => isRecord(r) && typeof r.registrationId === "string");
    const capacityErrors = gqlResults.filter(
      (r) =>
        isRecord(r) && typeof r.occurrenceId === "string" && typeof r.registrationId !== "string",
    );

    // Exactly 1 success, N-1 capacity exceeded errors
    expect(successes).toHaveLength(1);
    expect(capacityErrors).toHaveLength(N - 1);
  });
});

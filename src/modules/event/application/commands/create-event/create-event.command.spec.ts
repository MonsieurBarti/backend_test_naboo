import { randomUUID } from "node:crypto";
import { InMemoryEventRepository } from "src/modules/event/infrastructure/event/in-memory-event.repository";
import { InMemoryOccurrenceRepository } from "src/modules/event/infrastructure/occurrence/in-memory-occurrence.repository";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { beforeEach, describe, expect, it } from "vitest";
import { InvalidRecurrencePatternError } from "../../../domain/errors/event-base.error";
import { CreateEventCommand, CreateEventHandler } from "./create-event.command";

describe("CreateEventHandler", () => {
  let eventRepo: InMemoryEventRepository;
  let occurrenceRepo: InMemoryOccurrenceRepository;
  let dateProvider: FakeDateProvider;
  let handler: CreateEventHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository();
    occurrenceRepo = new InMemoryOccurrenceRepository();
    dateProvider = new FakeDateProvider(NOW);
    handler = new CreateEventHandler(eventRepo, occurrenceRepo, dateProvider);
  });

  it("should create a non-recurring event", async () => {
    // Arrange
    const eventId = randomUUID();
    const organizationId = randomUUID();

    const command = new CreateEventCommand({
      id: eventId,
      organizationId,
      title: "Monthly Meetup",
      description: "A regular meetup",
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: 100,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — event saved
    const savedEvent = await eventRepo.findById(eventId);
    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.id).toBe(eventId);
    expect(savedEvent?.organizationId).toBe(organizationId);

    // Assert — no occurrences created
    const occurrenceResult = await occurrenceRepo.findByEvent(eventId, { first: 100 });
    expect(occurrenceResult.items).toHaveLength(0);
  });

  it("should create a recurring event with materialized occurrences", async () => {
    // Arrange
    const eventId = randomUUID();
    const organizationId = randomUUID();

    // Weekly on Mondays for 4 occurrences
    const command = new CreateEventCommand({
      id: eventId,
      organizationId,
      title: "Weekly Standup",
      description: "Team standup",
      startDate: new Date("2026-03-02T09:00:00Z"), // Monday
      endDate: new Date("2026-03-02T10:00:00Z"),
      maxCapacity: 20,
      recurrencePattern: {
        frequency: "WEEKLY",
        interval: 1,
        byDay: ["MO"],
        count: 4,
      },
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — event saved
    const savedEvent = await eventRepo.findById(eventId);
    expect(savedEvent).not.toBeNull();
    expect(savedEvent?.id).toBe(eventId);

    // Assert — 4 occurrences created, each linked to the event
    const occurrenceResult = await occurrenceRepo.findByEvent(eventId, { first: 100 });
    expect(occurrenceResult.items).toHaveLength(4);

    for (const occ of occurrenceResult.items) {
      expect(occ.eventId).toBe(eventId);
      expect(occ.organizationId).toBe(organizationId);
    }
  });

  it("should throw InvalidRecurrencePatternError for invalid recurrence pattern", async () => {
    // Arrange — "INVALID" is not a valid frequency
    const command = new CreateEventCommand({
      id: randomUUID(),
      organizationId: randomUUID(),
      title: "Bad Event",
      description: "Broken recurrence",
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: 50,
      recurrencePattern: {
        // biome-ignore lint/suspicious/noExplicitAny: intentional invalid value for test
        frequency: "INVALID" as any,
      },
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(InvalidRecurrencePatternError);
  });
});

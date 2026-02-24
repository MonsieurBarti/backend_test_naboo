import { randomUUID } from "node:crypto";
import { EventBuilder } from "src/modules/event/domain/event/event.builder";
import { OccurrenceBuilder } from "src/modules/event/domain/occurrence/occurrence.builder";
import { InMemoryEventRepository } from "src/modules/event/infrastructure/event/in-memory-event.repository";
import { InMemoryOccurrenceRepository } from "src/modules/event/infrastructure/occurrence/in-memory-occurrence.repository";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { beforeEach, describe, expect, it } from "vitest";
import { EventNotFoundError } from "../../../domain/errors/event-base.error";
import { UpdateEventCommand, UpdateEventHandler } from "./update-event.command";

describe("UpdateEventHandler", () => {
  let eventRepo: InMemoryEventRepository;
  let occurrenceRepo: InMemoryOccurrenceRepository;
  let dateProvider: FakeDateProvider;
  let handler: UpdateEventHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository();
    occurrenceRepo = new InMemoryOccurrenceRepository();
    dateProvider = new FakeDateProvider(NOW);
    handler = new UpdateEventHandler(eventRepo, occurrenceRepo, dateProvider);
  });

  it("should update event title", async () => {
    // Arrange
    const eventId = randomUUID();
    const event = new EventBuilder().withId(eventId).withTitle("Old Title").build();
    await eventRepo.save(event);

    const command = new UpdateEventCommand({
      eventId,
      title: "New Title",
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — title updated, updatedAt advanced to NOW
    const updated = await eventRepo.findById(eventId);
    expect(updated).not.toBeNull();
    expect(updated?.title).toBe("New Title");
    expect(updated?.updatedAt).toEqual(NOW);
  });

  it("should wipe and regenerate occurrences when recurrence pattern changes", async () => {
    // Arrange — pre-save a recurring event with 4 occurrences
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const event = new EventBuilder()
      .withId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-02T09:00:00Z"))
      .withEndDate(new Date("2026-03-02T10:00:00Z"))
      .withRecurrencePattern({ frequency: "WEEKLY", interval: 1, byDay: ["MO"], count: 4 })
      .build();
    await eventRepo.save(event);

    // Save 4 old occurrences
    const oldOccurrenceIds: string[] = [];
    for (let i = 0; i < 4; i++) {
      const occ = new OccurrenceBuilder()
        .withEventId(eventId)
        .withOrganizationId(organizationId)
        .withStartDate(new Date(`2026-03-0${i + 2}T09:00:00Z`))
        .withEndDate(new Date(`2026-03-0${i + 2}T10:00:00Z`))
        .build();
      oldOccurrenceIds.push(occ.id);
      await occurrenceRepo.save(occ);
    }

    // Change to a 2-occurrence pattern
    const command = new UpdateEventCommand({
      eventId,
      recurrencePattern: { frequency: "WEEKLY", interval: 1, byDay: ["TU"], count: 2 },
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — old occurrences deleted
    for (const oldId of oldOccurrenceIds) {
      const old = await occurrenceRepo.findById(oldId);
      expect(old).toBeNull();
    }

    // Assert — new occurrences created (count=2)
    const newResult = await occurrenceRepo.findByEvent(eventId, { first: 100 });
    expect(newResult.items).toHaveLength(2);
    for (const occ of newResult.items) {
      expect(occ.eventId).toBe(eventId);
      expect(occ.organizationId).toBe(organizationId);
    }
  });

  it("should propagate field changes to future occurrences for recurring event", async () => {
    // Arrange — pre-save a recurring event with occurrences (some past, some future)
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const event = new EventBuilder()
      .withId(eventId)
      .withOrganizationId(organizationId)
      .withTitle("Old Title")
      .withRecurrencePattern({ frequency: "WEEKLY", interval: 1, byDay: ["MO"], count: 4 })
      .build();
    await eventRepo.save(event);

    // Past occurrence (startDate < NOW)
    const pastOcc = new OccurrenceBuilder()
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withTitle("Old Title")
      .withStartDate(new Date("2026-02-10T09:00:00Z")) // before NOW
      .withEndDate(new Date("2026-02-10T10:00:00Z"))
      .build();
    await occurrenceRepo.save(pastOcc);

    // Future occurrence (startDate >= NOW)
    const futureOcc = new OccurrenceBuilder()
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withTitle("Old Title")
      .withStartDate(new Date("2026-03-02T09:00:00Z")) // after NOW
      .withEndDate(new Date("2026-03-02T10:00:00Z"))
      .build();
    await occurrenceRepo.save(futureOcc);

    const command = new UpdateEventCommand({
      eventId,
      title: "New Title",
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — future occurrence has updated title
    const updatedFuture = await occurrenceRepo.findById(futureOcc.id);
    expect(updatedFuture?.title).toBe("New Title");

    // Assert — past occurrence unchanged
    const updatedPast = await occurrenceRepo.findById(pastOcc.id);
    expect(updatedPast?.title).toBe("Old Title");
  });

  it("should throw EventNotFoundError for non-existent eventId", async () => {
    // Arrange
    const command = new UpdateEventCommand({
      eventId: randomUUID(),
      title: "New Title",
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(EventNotFoundError);
  });

  it("should throw EventNotFoundError for deleted event", async () => {
    // Arrange — pre-save a soft-deleted event
    const eventId = randomUUID();
    const deletedEvent = new EventBuilder()
      .withId(eventId)
      .asDeleted(new Date("2026-02-20T10:00:00Z"))
      .build();
    await eventRepo.save(deletedEvent);

    const command = new UpdateEventCommand({
      eventId,
      title: "New Title",
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(EventNotFoundError);
  });
});

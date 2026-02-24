import { randomUUID } from "node:crypto";
import { EventBuilder } from "src/modules/event/domain/event/event.builder";
import { OccurrenceBuilder } from "src/modules/event/domain/occurrence/occurrence.builder";
import { InMemoryEventRepository } from "src/modules/event/infrastructure/event/in-memory-event.repository";
import { InMemoryOccurrenceRepository } from "src/modules/event/infrastructure/occurrence/in-memory-occurrence.repository";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { beforeEach, describe, expect, it } from "vitest";
import { EventNotFoundError } from "../../../domain/errors/event-base.error";
import { DeleteEventCommand, DeleteEventHandler } from "./delete-event.command";

describe("DeleteEventHandler", () => {
  let eventRepo: InMemoryEventRepository;
  let occurrenceRepo: InMemoryOccurrenceRepository;
  let dateProvider: FakeDateProvider;
  let handler: DeleteEventHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    eventRepo = new InMemoryEventRepository();
    occurrenceRepo = new InMemoryOccurrenceRepository();
    dateProvider = new FakeDateProvider(NOW);
    handler = new DeleteEventHandler(eventRepo, occurrenceRepo, dateProvider);
  });

  it("should soft-delete event and cascade to occurrences", async () => {
    // Arrange — pre-save event + 3 occurrences
    const eventId = randomUUID();
    const organizationId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(organizationId).build();
    await eventRepo.save(event);

    const occurrenceIds: string[] = [];
    for (let i = 0; i < 3; i++) {
      const occ = new OccurrenceBuilder()
        .withEventId(eventId)
        .withOrganizationId(organizationId)
        .withStartDate(new Date(`2026-03-0${i + 1}T09:00:00Z`))
        .withEndDate(new Date(`2026-03-0${i + 1}T10:00:00Z`))
        .build();
      occurrenceIds.push(occ.id);
      await occurrenceRepo.save(occ);
    }

    const command = new DeleteEventCommand({
      eventId,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — event has deletedAt set to NOW
    const deletedEvent = await eventRepo.findById(eventId);
    expect(deletedEvent).not.toBeNull();
    expect(deletedEvent?.deletedAt).toEqual(NOW);
    expect(deletedEvent?.isDeleted).toBe(true);

    // Assert — all 3 occurrences have deletedAt set
    for (const occId of occurrenceIds) {
      const deletedOcc = await occurrenceRepo.findById(occId);
      expect(deletedOcc).not.toBeNull();
      expect(deletedOcc?.deletedAt).toEqual(NOW);
    }
  });

  it("should throw EventNotFoundError for non-existent eventId", async () => {
    // Arrange
    const command = new DeleteEventCommand({
      eventId: randomUUID(),
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(EventNotFoundError);
  });

  it("should throw EventNotFoundError for already-deleted event", async () => {
    // Arrange — pre-save a soft-deleted event
    const eventId = randomUUID();
    const deletedEvent = new EventBuilder()
      .withId(eventId)
      .asDeleted(new Date("2026-02-20T10:00:00Z"))
      .build();
    await eventRepo.save(deletedEvent);

    const command = new DeleteEventCommand({
      eventId,
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(EventNotFoundError);
  });
});

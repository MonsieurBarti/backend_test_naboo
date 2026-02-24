import { randomUUID } from "node:crypto";
import { EventBuilder } from "src/modules/event/domain/event/event.builder";
import { OccurrenceBuilder } from "src/modules/event/domain/occurrence/occurrence.builder";
import { InMemoryEventRepository } from "src/modules/event/infrastructure/event/in-memory-event.repository";
import { InMemoryOccurrenceRepository } from "src/modules/event/infrastructure/occurrence/in-memory-occurrence.repository";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { beforeEach, describe, expect, it } from "vitest";
import {
  AlreadyRegisteredError,
  CapacityExceededError,
  ConflictDetectedError,
  EventCancelledError,
  OccurrenceInPastError,
  OccurrenceNotFoundError,
} from "../../../domain/errors/registration-base.error";
import { RegistrationBuilder } from "../../../domain/registration/registration.builder";
import { InMemoryRegistrationRepository } from "../../../infrastructure/registration/in-memory-registration.repository";
import {
  RegisterForOccurrenceCommand,
  RegisterForOccurrenceHandler,
} from "./register-for-occurrence.command";

describe("RegisterForOccurrence", () => {
  let registrationRepo: InMemoryRegistrationRepository;
  let occurrenceRepo: InMemoryOccurrenceRepository;
  let eventRepo: InMemoryEventRepository;
  let dateProvider: FakeDateProvider;
  let handler: RegisterForOccurrenceHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    registrationRepo = new InMemoryRegistrationRepository();
    occurrenceRepo = new InMemoryOccurrenceRepository();
    eventRepo = new InMemoryEventRepository();
    dateProvider = new FakeDateProvider(NOW);
    handler = new RegisterForOccurrenceHandler(
      registrationRepo,
      occurrenceRepo,
      eventRepo,
      dateProvider,
    );
  });

  it("should register user for a future occurrence with available capacity", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    const event = new EventBuilder()
      .withId(eventId)
      .withOrganizationId(organizationId)
      .withTitle("Tech Conference")
      .build();
    await eventRepo.save(event);

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withOverrides({ maxCapacity: 50 })
      .withRegisteredSeats(5)
      .build();
    await occurrenceRepo.save(occurrence);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 1,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert
    const reg = await registrationRepo.findByUserAndOccurrence(userId, occurrenceId);
    expect(reg).not.toBeNull();
    expect(reg?.status).toBe("active");
    expect(reg?.seatCount).toBe(1);

    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(6);
  });

  it("should register with seatCount=3 and increment registeredSeats by 3", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(organizationId).build();
    await eventRepo.save(event);

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withOverrides({ maxCapacity: 50 })
      .withRegisteredSeats(0)
      .build();
    await occurrenceRepo.save(occurrence);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 3,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert
    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(3);
  });

  it("should throw CapacityExceededError when seats are not available", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(organizationId).build();
    await eventRepo.save(event);

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withOverrides({ maxCapacity: 10 })
      .withRegisteredSeats(9)
      .build();
    await occurrenceRepo.save(occurrence);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 2,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(CapacityExceededError);
  });

  it("should throw ConflictDetectedError when user has overlapping registration in another org", async () => {
    // Arrange
    const userId = randomUUID();
    const orgA = randomUUID();
    const orgB = randomUUID();

    // Existing registration in org A for overlapping time
    const existingReg = new RegistrationBuilder()
      .withUserId(userId)
      .withOrganizationId(orgA)
      .withStatus("active")
      .withOccurrenceTimeWindow(new Date("2026-03-01T09:00:00Z"), new Date("2026-03-01T17:00:00Z"))
      .withEventTitle("Other Event")
      .build();
    await registrationRepo.save(existingReg);

    const eventId = randomUUID();
    const occurrenceId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(orgB).build();
    await eventRepo.save(event);

    // New occurrence in org B overlapping with existing registration
    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(orgB)
      .withStartDate(new Date("2026-03-01T12:00:00Z"))
      .withEndDate(new Date("2026-03-01T20:00:00Z"))
      .withOverrides({ maxCapacity: 50 })
      .withRegisteredSeats(0)
      .build();
    await occurrenceRepo.save(occurrence);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 1,
      organizationId: orgB,
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(ConflictDetectedError);
  });

  it("should throw AlreadyRegisteredError when user is already actively registered", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(organizationId).build();
    await eventRepo.save(event);

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withOverrides({ maxCapacity: 50 })
      .build();
    await occurrenceRepo.save(occurrence);

    // Pre-existing active registration
    const existingReg = new RegistrationBuilder()
      .withUserId(userId)
      .withOccurrenceId(occurrenceId)
      .withOrganizationId(organizationId)
      .withStatus("active")
      .build();
    await registrationRepo.save(existingReg);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 1,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(AlreadyRegisteredError);
  });

  it("should reactivate cancelled registration instead of creating a duplicate", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    const event = new EventBuilder()
      .withId(eventId)
      .withOrganizationId(organizationId)
      .withTitle("Reunion")
      .build();
    await eventRepo.save(event);

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withOverrides({ maxCapacity: 50 })
      .withRegisteredSeats(2)
      .build();
    await occurrenceRepo.save(occurrence);

    // Pre-existing cancelled registration
    const cancelledReg = new RegistrationBuilder()
      .withUserId(userId)
      .withOccurrenceId(occurrenceId)
      .withOrganizationId(organizationId)
      .withSeatCount(2)
      .asCancelled()
      .build();
    const originalId = cancelledReg.id;
    await registrationRepo.save(cancelledReg);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 3,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — same registration id, reactivated
    const reg = await registrationRepo.findByUserAndOccurrence(userId, occurrenceId);
    expect(reg).not.toBeNull();
    expect(reg?.id).toBe(originalId);
    expect(reg?.status).toBe("active");
    expect(reg?.seatCount).toBe(3);
    expect(reg?.deletedAt).toBeUndefined();

    // registeredSeats incremented by new seatCount (3)
    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(5);
  });

  it("should throw OccurrenceInPastError when occurrence endDate is before now", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(organizationId).build();
    await eventRepo.save(event);

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-02-20T09:00:00Z"))
      .withEndDate(new Date("2026-02-20T17:00:00Z")) // in the past relative to NOW
      .build();
    await occurrenceRepo.save(occurrence);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 1,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(OccurrenceInPastError);
  });

  it("should throw EventCancelledError for soft-deleted occurrence", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(organizationId).build();
    await eventRepo.save(event);

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .asDeleted()
      .build();
    await occurrenceRepo.save(occurrence);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 1,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(EventCancelledError);
  });

  it("should throw OccurrenceNotFoundError for non-existent occurrenceId", async () => {
    // Arrange
    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId: randomUUID(),
      userId: randomUUID(),
      seatCount: 1,
      organizationId: randomUUID(),
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(OccurrenceNotFoundError);
  });

  it("should allow back-to-back events (strict overlap: start < otherEnd AND end > otherStart)", async () => {
    // Arrange
    const userId = randomUUID();
    const organizationId = randomUUID();

    // Existing registration ending at 10:00
    const existingReg = new RegistrationBuilder()
      .withUserId(userId)
      .withOrganizationId(organizationId)
      .withStatus("active")
      .withOccurrenceTimeWindow(new Date("2026-03-01T08:00:00Z"), new Date("2026-03-01T10:00:00Z"))
      .build();
    await registrationRepo.save(existingReg);

    const eventId = randomUUID();
    const occurrenceId = randomUUID();

    const event = new EventBuilder().withId(eventId).withOrganizationId(organizationId).build();
    await eventRepo.save(event);

    // New occurrence starts exactly at 10:00 (back-to-back, no overlap)
    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withEventId(eventId)
      .withOrganizationId(organizationId)
      .withStartDate(new Date("2026-03-01T10:00:00Z"))
      .withEndDate(new Date("2026-03-01T12:00:00Z"))
      .withOverrides({ maxCapacity: 50 })
      .withRegisteredSeats(0)
      .build();
    await occurrenceRepo.save(occurrence);

    const command = new RegisterForOccurrenceCommand({
      registrationId: randomUUID(),
      occurrenceId,
      userId,
      seatCount: 1,
      organizationId,
      correlationId: randomUUID(),
    });

    // Act & Assert — should NOT throw
    await expect(handler.execute(command)).resolves.toBeUndefined();
  });
});

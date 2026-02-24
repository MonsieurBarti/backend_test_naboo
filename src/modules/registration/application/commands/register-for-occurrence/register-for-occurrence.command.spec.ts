import { randomUUID } from "node:crypto";
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
import { InMemoryEventModuleInProc } from "../../../infrastructure/in-memory-event-module.in-proc";
import { InMemoryRegistrationRepository } from "../../../infrastructure/registration/in-memory-registration.repository";
import {
  RegisterForOccurrenceCommand,
  RegisterForOccurrenceHandler,
} from "./register-for-occurrence.command";

describe("RegisterForOccurrence", () => {
  let registrationRepo: InMemoryRegistrationRepository;
  let eventModule: InMemoryEventModuleInProc;
  let dateProvider: FakeDateProvider;
  let handler: RegisterForOccurrenceHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    registrationRepo = new InMemoryRegistrationRepository();
    eventModule = new InMemoryEventModuleInProc();
    dateProvider = new FakeDateProvider(NOW);
    handler = new RegisterForOccurrenceHandler(registrationRepo, eventModule, dateProvider);
  });

  it("should register user for a future occurrence with available capacity", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    eventModule.seedEvent({ id: eventId, title: "Tech Conference", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: 50,
      registeredSeats: 5,
      deletedAt: undefined,
    });

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

    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(6);
  });

  it("should register with seatCount=3 and increment registeredSeats by 3", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    eventModule.seedEvent({ id: eventId, title: "Event", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: 50,
      registeredSeats: 0,
      deletedAt: undefined,
    });

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
    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(3);
  });

  it("should throw CapacityExceededError when seats are not available", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    eventModule.seedEvent({ id: eventId, title: "Event", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: 10,
      registeredSeats: 9,
      deletedAt: undefined,
    });

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

    eventModule.seedEvent({ id: eventId, title: "Event", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId: orgB,
      startDate: new Date("2026-03-01T12:00:00Z"),
      endDate: new Date("2026-03-01T20:00:00Z"),
      maxCapacity: 50,
      registeredSeats: 0,
      deletedAt: undefined,
    });

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

    eventModule.seedEvent({ id: eventId, title: "Event", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: 50,
      registeredSeats: 0,
      deletedAt: undefined,
    });

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

    eventModule.seedEvent({ id: eventId, title: "Reunion", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: 50,
      registeredSeats: 2,
      deletedAt: undefined,
    });

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
    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(5);
  });

  it("should throw OccurrenceInPastError when occurrence endDate is before now", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const eventId = randomUUID();
    const organizationId = randomUUID();
    const userId = randomUUID();

    eventModule.seedEvent({ id: eventId, title: "Event", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-02-20T09:00:00Z"),
      endDate: new Date("2026-02-20T17:00:00Z"), // in the past relative to NOW
      maxCapacity: undefined,
      registeredSeats: 0,
      deletedAt: undefined,
    });

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

    eventModule.seedEvent({ id: eventId, title: "Event", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: undefined,
      registeredSeats: 0,
      deletedAt: new Date(),
    });

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

    eventModule.seedEvent({ id: eventId, title: "Event", isDeleted: false });
    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId,
      organizationId,
      startDate: new Date("2026-03-01T10:00:00Z"),
      endDate: new Date("2026-03-01T12:00:00Z"),
      maxCapacity: 50,
      registeredSeats: 0,
      deletedAt: undefined,
    });

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

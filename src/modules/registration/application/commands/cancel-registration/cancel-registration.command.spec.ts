import { randomUUID } from "node:crypto";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { beforeEach, describe, expect, it } from "vitest";
import { RegistrationNotFoundError } from "../../../domain/errors/registration-base.error";
import { RegistrationBuilder } from "../../../domain/registration/registration.builder";
import { InMemoryEventModuleInProc } from "../../../infrastructure/in-memory-event-module.in-proc";
import { InMemoryRegistrationRepository } from "../../../infrastructure/registration/in-memory-registration.repository";
import {
  CancelRegistrationCommand,
  CancelRegistrationHandler,
} from "./cancel-registration.command";

describe("CancelRegistration", () => {
  let registrationRepo: InMemoryRegistrationRepository;
  let eventModule: InMemoryEventModuleInProc;
  let dateProvider: FakeDateProvider;
  let handler: CancelRegistrationHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    registrationRepo = new InMemoryRegistrationRepository();
    eventModule = new InMemoryEventModuleInProc();
    dateProvider = new FakeDateProvider(NOW);
    handler = new CancelRegistrationHandler(registrationRepo, eventModule, dateProvider);
  });

  it("should fully cancel an active registration and decrement registeredSeats", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const registrationId = randomUUID();

    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId: randomUUID(),
      organizationId: randomUUID(),
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: undefined,
      registeredSeats: 5,
      deletedAt: undefined,
    });

    const registration = new RegistrationBuilder()
      .withId(registrationId)
      .withOccurrenceId(occurrenceId)
      .withSeatCount(5)
      .withStatus("active")
      .build();
    await registrationRepo.save(registration);

    const command = new CancelRegistrationCommand({
      registrationId,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert
    const updated = await registrationRepo.findById(registrationId);
    expect(updated?.status).toBe("cancelled");
    expect(updated?.deletedAt).toEqual(NOW);

    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(0);
  });

  it("should partially cancel: reduce seatCount and decrement registeredSeats by delta", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const registrationId = randomUUID();

    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId: randomUUID(),
      organizationId: randomUUID(),
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: undefined,
      registeredSeats: 5,
      deletedAt: undefined,
    });

    const registration = new RegistrationBuilder()
      .withId(registrationId)
      .withOccurrenceId(occurrenceId)
      .withSeatCount(5)
      .withStatus("active")
      .build();
    await registrationRepo.save(registration);

    const command = new CancelRegistrationCommand({
      registrationId,
      newSeatCount: 3,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — still active, seatCount = 3, occurrence decremented by 2
    const updated = await registrationRepo.findById(registrationId);
    expect(updated?.status).toBe("active");
    expect(updated?.seatCount).toBe(3);

    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(3);
  });

  it("should treat newSeatCount=0 as full cancellation", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const registrationId = randomUUID();

    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId: randomUUID(),
      organizationId: randomUUID(),
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: undefined,
      registeredSeats: 3,
      deletedAt: undefined,
    });

    const registration = new RegistrationBuilder()
      .withId(registrationId)
      .withOccurrenceId(occurrenceId)
      .withSeatCount(3)
      .withStatus("active")
      .build();
    await registrationRepo.save(registration);

    const command = new CancelRegistrationCommand({
      registrationId,
      newSeatCount: 0,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — fully cancelled
    const updated = await registrationRepo.findById(registrationId);
    expect(updated?.status).toBe("cancelled");
    expect(updated?.deletedAt).toEqual(NOW);

    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(0);
  });

  it("should throw RegistrationNotFoundError for non-existent registrationId", async () => {
    // Arrange
    const command = new CancelRegistrationCommand({
      registrationId: randomUUID(),
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(RegistrationNotFoundError);
  });

  it("should be idempotent: return silently if registration is already cancelled (full cancel)", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const registrationId = randomUUID();

    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId: randomUUID(),
      organizationId: randomUUID(),
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: undefined,
      registeredSeats: 0,
      deletedAt: undefined,
    });

    const registration = new RegistrationBuilder()
      .withId(registrationId)
      .withOccurrenceId(occurrenceId)
      .withSeatCount(3)
      .asCancelled()
      .build();
    await registrationRepo.save(registration);

    const command = new CancelRegistrationCommand({
      registrationId,
      correlationId: randomUUID(),
    });

    // Act — should NOT throw
    await expect(handler.execute(command)).resolves.toBeUndefined();

    // Occurrence seats unchanged
    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(0);
  });

  it("should restore exact capacity: registeredSeats reflects the decrement after cancellation", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const reg1Id = randomUUID();
    const reg2Id = randomUUID();

    eventModule.seedOccurrence({
      id: occurrenceId,
      eventId: randomUUID(),
      organizationId: randomUUID(),
      startDate: new Date("2026-03-01T09:00:00Z"),
      endDate: new Date("2026-03-01T17:00:00Z"),
      maxCapacity: undefined,
      registeredSeats: 7,
      deletedAt: undefined,
    });

    // Two registrations: 4 seats and 3 seats
    const reg1 = new RegistrationBuilder()
      .withId(reg1Id)
      .withOccurrenceId(occurrenceId)
      .withSeatCount(4)
      .withStatus("active")
      .build();
    await registrationRepo.save(reg1);

    const reg2 = new RegistrationBuilder()
      .withId(reg2Id)
      .withOccurrenceId(occurrenceId)
      .withSeatCount(3)
      .withStatus("active")
      .build();
    await registrationRepo.save(reg2);

    // Cancel reg1 (4 seats)
    const command = new CancelRegistrationCommand({
      registrationId: reg1Id,
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert: 7 - 4 = 3 seats remaining
    const updatedOccurrence = eventModule.getOccurrence(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(3);
  });
});

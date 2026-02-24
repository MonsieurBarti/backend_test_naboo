import { randomUUID } from "node:crypto";
import { beforeEach, describe, expect, it } from "vitest";
import { OccurrenceBuilder } from "../../../../../modules/event/domain/occurrence/occurrence.builder";
import { InMemoryOccurrenceRepository } from "../../../../../modules/event/infrastructure/occurrence/in-memory-occurrence.repository";
import { RegistrationNotFoundError } from "../../../domain/errors/registration-base.error";
import { RegistrationBuilder } from "../../../domain/registration/registration.builder";
import { InMemoryRegistrationRepository } from "../../../infrastructure/registration/in-memory-registration.repository";
import {
  CancelRegistrationCommand,
  CancelRegistrationHandler,
} from "./cancel-registration.command";

class StubDateProvider {
  private _now: Date;
  constructor(now: Date) {
    this._now = now;
  }
  now(): Date {
    return this._now;
  }
}

describe("CancelRegistration", () => {
  let registrationRepo: InMemoryRegistrationRepository;
  let occurrenceRepo: InMemoryOccurrenceRepository;
  let dateProvider: StubDateProvider;
  let handler: CancelRegistrationHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    registrationRepo = new InMemoryRegistrationRepository();
    occurrenceRepo = new InMemoryOccurrenceRepository();
    dateProvider = new StubDateProvider(NOW);
    handler = new CancelRegistrationHandler(
      registrationRepo,
      occurrenceRepo,
      dateProvider as unknown as import("../../../../../shared/date/date-provider").IDateProvider,
    );
  });

  it("should fully cancel an active registration and decrement registeredSeats", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const registrationId = randomUUID();

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withRegisteredSeats(5)
      .build();
    await occurrenceRepo.save(occurrence);

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

    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(0);
  });

  it("should partially cancel: reduce seatCount and decrement registeredSeats by delta", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const registrationId = randomUUID();

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withRegisteredSeats(5)
      .build();
    await occurrenceRepo.save(occurrence);

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

    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(3);
  });

  it("should treat newSeatCount=0 as full cancellation", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const registrationId = randomUUID();

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withRegisteredSeats(3)
      .build();
    await occurrenceRepo.save(occurrence);

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

    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
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

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withRegisteredSeats(0)
      .build();
    await occurrenceRepo.save(occurrence);

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
    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(0);
  });

  it("should restore exact capacity: registeredSeats reflects the decrement after cancellation", async () => {
    // Arrange
    const occurrenceId = randomUUID();
    const reg1Id = randomUUID();
    const reg2Id = randomUUID();

    const occurrence = new OccurrenceBuilder()
      .withId(occurrenceId)
      .withStartDate(new Date("2026-03-01T09:00:00Z"))
      .withEndDate(new Date("2026-03-01T17:00:00Z"))
      .withRegisteredSeats(7)
      .build();
    await occurrenceRepo.save(occurrence);

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
    const updatedOccurrence = await occurrenceRepo.findById(occurrenceId);
    expect(updatedOccurrence?.registeredSeats).toBe(3);
  });
});

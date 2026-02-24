import { BaseDomainError } from "../../../../shared/errors/base-domain.error";

export abstract class EventBaseError extends BaseDomainError {
  abstract override readonly errorCode: string;
}

export class EventNotFoundError extends EventBaseError {
  override readonly errorCode = "EVENT.NOT_FOUND";

  constructor(
    eventId: string,
    options: { correlationId: string; metadata?: Record<string, unknown> },
  ) {
    super(`Event "${eventId}" not found`, {
      reportToMonitoring: false,
      correlationId: options.correlationId,
      metadata: { eventId, ...options.metadata },
    });
  }
}

export class MaxOccurrencesExceededError extends EventBaseError {
  override readonly errorCode = "EVENT.MAX_OCCURRENCES_EXCEEDED";

  constructor(
    count: number,
    options: { correlationId: string; metadata?: Record<string, unknown> },
  ) {
    super(`Recurrence pattern would generate more than ${count} occurrences`, {
      reportToMonitoring: false,
      correlationId: options.correlationId,
      metadata: { count, ...options.metadata },
    });
  }
}

export class InvalidRecurrencePatternError extends EventBaseError {
  override readonly errorCode = "EVENT.INVALID_RECURRENCE_PATTERN";

  constructor(
    message: string,
    options: { correlationId: string; metadata?: Record<string, unknown> },
  ) {
    super(message, {
      reportToMonitoring: false,
      correlationId: options.correlationId,
      metadata: options.metadata,
    });
  }
}

export class OccurrenceCapacityExceededError extends EventBaseError {
  override readonly errorCode = "EVENT.OCCURRENCE_CAPACITY_EXCEEDED";

  constructor(occurrenceId: string, options?: { correlationId?: string }) {
    super(`Capacity exceeded for occurrence "${occurrenceId}"`, {
      reportToMonitoring: false,
      correlationId: options?.correlationId,
      metadata: { occurrenceId },
    });
  }
}

export class SeatDecrementBelowZeroError extends EventBaseError {
  override readonly errorCode = "EVENT.SEAT_DECREMENT_BELOW_ZERO";

  constructor(occurrenceId: string, options?: { correlationId?: string }) {
    super(`Cannot decrement registeredSeats below zero for occurrence "${occurrenceId}"`, {
      reportToMonitoring: false,
      correlationId: options?.correlationId,
      metadata: { occurrenceId },
    });
  }
}

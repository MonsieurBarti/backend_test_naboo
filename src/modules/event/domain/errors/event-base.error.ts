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

import { BaseDomainError } from "../../../../shared/errors/base-domain.error";

export abstract class RegistrationBaseError extends BaseDomainError {
  abstract override readonly errorCode: string;
}

export class CapacityExceededError extends RegistrationBaseError {
  readonly errorCode = "REGISTRATION.CAPACITY_EXCEEDED";

  constructor(
    occurrenceId: string,
    options?: { correlationId?: string },
  ) {
    super(`Occurrence "${occurrenceId}" has no remaining capacity`, {
      reportToMonitoring: false,
      correlationId: options?.correlationId,
      metadata: { occurrenceId },
    });
  }
}

export class ConflictDetectedError extends RegistrationBaseError {
  readonly errorCode = "REGISTRATION.CONFLICT_DETECTED";

  constructor(
    conflict: {
      conflictingOccurrenceId: string;
      eventTitle: string;
      startDate: Date;
      endDate: Date;
    },
    options?: { correlationId?: string },
  ) {
    super(
      `Registration conflicts with occurrence "${conflict.conflictingOccurrenceId}" of "${conflict.eventTitle}" (${conflict.startDate.toISOString()} – ${conflict.endDate.toISOString()})`,
      {
        reportToMonitoring: false,
        correlationId: options?.correlationId,
        metadata: {
          conflictingOccurrenceId: conflict.conflictingOccurrenceId,
          eventTitle: conflict.eventTitle,
          startDate: conflict.startDate,
          endDate: conflict.endDate,
        },
      },
    );
  }
}

export class AlreadyRegisteredError extends RegistrationBaseError {
  readonly errorCode = "REGISTRATION.ALREADY_REGISTERED";

  constructor(
    userId: string,
    occurrenceId: string,
    options?: { correlationId?: string },
  ) {
    super(`User "${userId}" is already registered for occurrence "${occurrenceId}"`, {
      reportToMonitoring: false,
      correlationId: options?.correlationId,
      metadata: { userId, occurrenceId },
    });
  }
}

export class OccurrenceInPastError extends RegistrationBaseError {
  readonly errorCode = "REGISTRATION.OCCURRENCE_IN_PAST";

  constructor(
    occurrenceId: string,
    options?: { correlationId?: string },
  ) {
    super(`Occurrence "${occurrenceId}" is in the past`, {
      reportToMonitoring: false,
      correlationId: options?.correlationId,
      metadata: { occurrenceId },
    });
  }
}

export class EventCancelledError extends RegistrationBaseError {
  readonly errorCode = "REGISTRATION.EVENT_CANCELLED";

  constructor(
    occurrenceId: string,
    options?: { correlationId?: string },
  ) {
    super(`Occurrence "${occurrenceId}" belongs to a cancelled event`, {
      reportToMonitoring: false,
      correlationId: options?.correlationId,
      metadata: { occurrenceId },
    });
  }
}

export class NotOrgMemberError extends RegistrationBaseError {
  readonly errorCode = "REGISTRATION.NOT_ORG_MEMBER";

  constructor(
    userId: string,
    organizationId: string,
    options?: { correlationId?: string },
  ) {
    super(
      `User "${userId}" is not a member of organization "${organizationId}"`,
      {
        reportToMonitoring: false,
        correlationId: options?.correlationId,
        metadata: { userId, organizationId },
      },
    );
  }
}

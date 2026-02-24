import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { TypedCommand } from "../../../../../shared/cqrs/typed-command";
import { IDateProvider } from "../../../../../shared/date/date-provider";
import { IEventRepository } from "../../../../event/domain/event/event.repository";
import { IOccurrenceRepository } from "../../../../event/domain/occurrence/occurrence.repository";
import { EVENT_REPOSITORY, OCCURRENCE_REPOSITORY } from "../../../../event/event.tokens";
import {
  AlreadyRegisteredError,
  CapacityExceededError,
  ConflictDetectedError,
  EventCancelledError,
  OccurrenceInPastError,
  OccurrenceNotFoundError,
} from "../../../domain/errors/registration-base.error";
import { Registration } from "../../../domain/registration/registration";
import { IRegistrationRepository } from "../../../domain/registration/registration.repository";
import { REGISTRATION_REPOSITORY } from "../../../registration.tokens";

export class RegisterForOccurrenceCommand extends TypedCommand<void> {
  constructor(
    public readonly props: {
      readonly occurrenceId: string;
      readonly userId: string;
      readonly seatCount: number;
      readonly organizationId: string;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@CommandHandler(RegisterForOccurrenceCommand)
@Injectable()
export class RegisterForOccurrenceHandler implements ICommandHandler<RegisterForOccurrenceCommand> {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: IRegistrationRepository,
    @Inject(OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepo: IOccurrenceRepository,
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(command: RegisterForOccurrenceCommand): Promise<void> {
    const { occurrenceId, userId, seatCount, organizationId, correlationId } = command.props;

    await this.registrationRepo.withTransaction(async (session) => {
      const now = this.dateProvider.now();

      // 1. Find occurrence by id
      const occurrence = await this.occurrenceRepo.findById(occurrenceId, session);
      if (occurrence === null) {
        throw new OccurrenceNotFoundError(occurrenceId, { correlationId });
      }

      // 2. Soft-deleted occurrence → EventCancelledError
      if (occurrence.deletedAt !== undefined) {
        throw new EventCancelledError(occurrenceId, { correlationId });
      }

      // 3. Past occurrence → OccurrenceInPastError
      if (occurrence.endDate <= now) {
        throw new OccurrenceInPastError(occurrenceId, { correlationId });
      }

      // 4. Find event — check if deleted
      const event = await this.eventRepo.findById(occurrence.eventId, session);
      if (event === null || event.isDeleted) {
        throw new EventCancelledError(occurrenceId, { correlationId });
      }

      // 5. Check existing registration
      const existing = await this.registrationRepo.findByUserAndOccurrence(userId, occurrenceId);

      if (existing !== null) {
        if (existing.isActive) {
          throw new AlreadyRegisteredError(userId, occurrenceId, { correlationId });
        }

        // Cancelled → reactivate and increment capacity
        const maxCap = occurrence.maxCapacity;
        if (maxCap !== undefined && occurrence.registeredSeats + seatCount > maxCap) {
          throw new CapacityExceededError(occurrenceId, { correlationId });
        }
        occurrence.incrementRegisteredSeats(seatCount);
        existing.reactivate(seatCount, now);
        await this.registrationRepo.save(existing, session);
        await this.occurrenceRepo.save(occurrence, session);
        return;
      }

      // 6. Overlap detection (cross-org — queries all active registrations for user)
      const overlapping = await this.registrationRepo.findOverlappingRegistrations(
        userId,
        occurrence.startDate,
        occurrence.endDate,
      );

      const conflict = overlapping[0];
      if (conflict !== undefined) {
        throw new ConflictDetectedError(
          {
            conflictingOccurrenceId: conflict.occurrenceId,
            eventTitle: conflict.eventTitle,
            startDate: conflict.occurrenceStartDate,
            endDate: conflict.occurrenceEndDate,
          },
          { correlationId },
        );
      }

      // 7. Capacity check + increment
      const maxCapacity = occurrence.maxCapacity;
      if (maxCapacity !== undefined && occurrence.registeredSeats + seatCount > maxCapacity) {
        throw new CapacityExceededError(occurrenceId, { correlationId });
      }
      occurrence.incrementRegisteredSeats(seatCount);

      // 8. Create new registration
      const registration = Registration.create({
        id: randomUUID(),
        occurrenceId,
        organizationId,
        userId,
        seatCount,
        occurrenceStartDate: occurrence.startDate,
        occurrenceEndDate: occurrence.endDate,
        eventTitle: event.title,
        createdAt: now,
        updatedAt: now,
      });

      await this.registrationRepo.save(registration, session);
      await this.occurrenceRepo.save(occurrence, session);
    });
  }
}

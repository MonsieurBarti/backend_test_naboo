import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { TypedCommand } from "../../../../../shared/cqrs/typed-command";
import { IDateProvider } from "../../../../../shared/date/date-provider";
import { IEventModuleInProc } from "../../../../../shared/in-proc/event-module.in-proc";
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
import { REGISTRATION_TOKENS } from "../../../registration.tokens";

export class RegisterForOccurrenceCommand extends TypedCommand<void> {
  constructor(
    public readonly props: {
      readonly registrationId: string;
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
    @Inject(REGISTRATION_TOKENS.REGISTRATION_REPOSITORY)
    private readonly registrationRepo: IRegistrationRepository,
    @Inject(REGISTRATION_TOKENS.EVENT_MODULE_IN_PROC)
    private readonly eventModule: IEventModuleInProc,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(command: RegisterForOccurrenceCommand): Promise<void> {
    const { registrationId, occurrenceId, userId, seatCount, organizationId, correlationId } =
      command.props;

    await this.registrationRepo.withTransaction(async (session) => {
      const now = this.dateProvider.now();

      // 1. Find occurrence by id
      const occurrence = await this.eventModule.findOccurrenceById(occurrenceId, session);
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
      const event = await this.eventModule.findEventById(occurrence.eventId, session);
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
        await this.eventModule.reserveSeats(occurrenceId, seatCount, session);
        existing.reactivate(seatCount, now);
        await this.registrationRepo.save(existing, session);
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
      await this.eventModule.reserveSeats(occurrenceId, seatCount, session);

      // 8. Create new registration
      const registration = Registration.createNew(
        {
          id: registrationId,
          occurrenceId,
          organizationId,
          userId,
          seatCount,
          occurrenceStartDate: occurrence.startDate,
          occurrenceEndDate: occurrence.endDate,
          eventTitle: event.title,
        },
        this.dateProvider,
      );

      await this.registrationRepo.save(registration, session);
    });
  }
}

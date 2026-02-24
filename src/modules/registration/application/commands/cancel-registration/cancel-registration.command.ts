import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { TypedCommand } from "../../../../../shared/cqrs/typed-command";
import { IDateProvider } from "../../../../../shared/date/date-provider";
import { IOccurrenceRepository } from "../../../../event/domain/occurrence/occurrence.repository";
import { OCCURRENCE_REPOSITORY } from "../../../../event/event.tokens";
import { RegistrationNotFoundError } from "../../../domain/errors/registration-base.error";
import { IRegistrationRepository } from "../../../domain/registration/registration.repository";
import { REGISTRATION_REPOSITORY } from "../../../registration.tokens";

export class CancelRegistrationCommand extends TypedCommand<void> {
  constructor(
    public readonly props: {
      readonly registrationId: string;
      readonly newSeatCount?: number;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@CommandHandler(CancelRegistrationCommand)
@Injectable()
export class CancelRegistrationHandler implements ICommandHandler<CancelRegistrationCommand> {
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: IRegistrationRepository,
    @Inject(OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepo: IOccurrenceRepository,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(command: CancelRegistrationCommand): Promise<void> {
    const { registrationId, newSeatCount, correlationId } = command.props;

    await this.registrationRepo.withTransaction(async (session) => {
      const now = this.dateProvider.now();

      // 1. Find registration by id
      const registration = await this.registrationRepo.findById(registrationId, session);
      if (registration === null) {
        throw new RegistrationNotFoundError(registrationId, { correlationId });
      }

      // 2. Determine cancellation type
      const isFullCancellation = newSeatCount === undefined || newSeatCount === 0;

      if (isFullCancellation) {
        // Idempotent: already cancelled → return silently
        if (!registration.isActive) {
          return;
        }

        // Find occurrence to decrement seats
        const occurrence = await this.occurrenceRepo.findById(registration.occurrenceId, session);

        // 3. Perform full cancellation
        const seatsDelta = registration.seatCount;
        registration.cancel(now);

        if (occurrence !== null) {
          occurrence.decrementRegisteredSeats(seatsDelta);
          await this.occurrenceRepo.save(occurrence, session);
        }

        await this.registrationRepo.save(registration, session);
      } else {
        // Partial cancellation: newSeatCount > 0
        const currentSeatCount = registration.seatCount;

        // If newSeatCount >= currentSeatCount, no-op
        if (newSeatCount >= currentSeatCount) {
          return;
        }

        const delta = currentSeatCount - newSeatCount;

        // Find occurrence to decrement seats by delta
        const occurrence = await this.occurrenceRepo.findById(registration.occurrenceId, session);

        registration.updateSeatCount(newSeatCount, now);

        if (occurrence !== null) {
          occurrence.decrementRegisteredSeats(delta);
          await this.occurrenceRepo.save(occurrence, session);
        }

        await this.registrationRepo.save(registration, session);
      }
    });
  }
}

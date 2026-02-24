import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { TypedCommand } from "../../../../../shared/cqrs/typed-command";
import { IDateProvider } from "../../../../../shared/date/date-provider";
import { EventNotFoundError } from "../../../domain/errors/event-base.error";
import { IEventRepository } from "../../../domain/event/event.repository";
import { IOccurrenceRepository } from "../../../domain/occurrence/occurrence.repository";
import { EVENT_REPOSITORY, OCCURRENCE_REPOSITORY } from "../../../event.tokens";

export class DeleteEventCommand extends TypedCommand<void> {
  constructor(
    public readonly props: {
      readonly eventId: string;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@CommandHandler(DeleteEventCommand)
@Injectable()
export class DeleteEventHandler implements ICommandHandler<DeleteEventCommand> {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository,
    @Inject(OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepo: IOccurrenceRepository,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(command: DeleteEventCommand): Promise<void> {
    const { props } = command;
    const now = this.dateProvider.now();

    await this.eventRepo.withTransaction(async (session) => {
      // Find event within transaction for consistent read
      const event = await this.eventRepo.findById(props.eventId, session);

      if (event === null) {
        throw new EventNotFoundError(props.eventId, { correlationId: props.correlationId });
      }

      // Deleted events are invisible to callers — treat as not found (idempotent guard)
      if (event.isDeleted) {
        throw new EventNotFoundError(props.eventId, { correlationId: props.correlationId });
      }

      // Soft-delete the event entity
      event.softDelete(now);
      await this.eventRepo.save(event, session);

      // Cascade soft-delete to all occurrences atomically in the same transaction
      await this.occurrenceRepo.softDeleteByEvent(event.id, now, session);
    });
  }
}

import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { addMilliseconds, differenceInMilliseconds } from "date-fns";
import { TypedCommand } from "../../../../../shared/cqrs/typed-command";
import { IDateProvider } from "../../../../../shared/date/date-provider";
import { InvalidRecurrencePatternError } from "../../../domain/errors/event-base.error";
import { Event } from "../../../domain/event/event";
import { IEventRepository } from "../../../domain/event/event.repository";
import type { RecurrencePatternProps } from "../../../domain/event/recurrence-pattern";
import { recurrencePatternSchema } from "../../../domain/event/recurrence-pattern";
import { Occurrence } from "../../../domain/occurrence/occurrence";
import { IOccurrenceRepository } from "../../../domain/occurrence/occurrence.repository";
import { EVENT_REPOSITORY, OCCURRENCE_REPOSITORY } from "../../../event.tokens";
import { materializeOccurrenceDates } from "../../services/occurrence-materializer.service";

export class CreateEventCommand extends TypedCommand<void> {
  constructor(
    public readonly props: {
      readonly id: string;
      readonly organizationId: string;
      readonly title: string;
      readonly description: string;
      readonly location?: string;
      readonly startDate: Date;
      readonly endDate: Date;
      readonly maxCapacity: number;
      readonly recurrencePattern?: RecurrencePatternProps;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@CommandHandler(CreateEventCommand)
@Injectable()
export class CreateEventHandler implements ICommandHandler<CreateEventCommand> {
  constructor(
    @Inject(EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository,
    @Inject(OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepo: IOccurrenceRepository,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(command: CreateEventCommand): Promise<void> {
    const { props } = command;

    // Validate recurrence pattern if provided
    let validatedPattern: RecurrencePatternProps | undefined;
    if (props.recurrencePattern !== undefined) {
      const parsed = recurrencePatternSchema.safeParse(props.recurrencePattern);
      if (!parsed.success) {
        throw new InvalidRecurrencePatternError(parsed.error.message, {
          correlationId: props.correlationId,
          metadata: { issues: parsed.error.issues },
        });
      }
      validatedPattern = parsed.data;
    }

    // Create event entity
    const event = Event.createNew(
      {
        id: props.id,
        organizationId: props.organizationId,
        title: props.title,
        description: props.description,
        location: props.location,
        startDate: props.startDate,
        endDate: props.endDate,
        maxCapacity: props.maxCapacity,
        recurrencePattern: validatedPattern,
      },
      this.dateProvider,
    );

    // If recurring, materialize occurrences and wrap in transaction
    if (validatedPattern !== undefined) {
      const occurrenceDates = materializeOccurrenceDates(validatedPattern, event.startDate);
      const durationMs = differenceInMilliseconds(event.endDate, event.startDate);

      const occurrences = occurrenceDates.map((startDate) =>
        Occurrence.createNew(
          {
            id: randomUUID(),
            eventId: event.id,
            organizationId: event.organizationId,
            startDate,
            endDate: addMilliseconds(startDate, durationMs),
          },
          this.dateProvider,
        ),
      );

      await this.eventRepo.withTransaction(async (session) => {
        await this.eventRepo.save(event, session);
        await this.occurrenceRepo.saveMany(occurrences, session);
      });
    } else {
      // Non-recurring: single save, no transaction needed
      await this.eventRepo.save(event);
    }
  }
}

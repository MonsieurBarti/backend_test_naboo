import { randomUUID } from "node:crypto";
import { Inject, Injectable } from "@nestjs/common";
import { CommandHandler, ICommandHandler } from "@nestjs/cqrs";
import { addMilliseconds, differenceInMilliseconds } from "date-fns";
import { TypedCommand } from "../../../../../shared/cqrs/typed-command";
import { IDateProvider } from "../../../../../shared/date/date-provider";
import {
  EventNotFoundError,
  InvalidRecurrencePatternError,
} from "../../../domain/errors/event-base.error";
import { IEventRepository } from "../../../domain/event/event.repository";
import type { RecurrencePatternProps } from "../../../domain/event/recurrence-pattern";
import { recurrencePatternSchema } from "../../../domain/event/recurrence-pattern";
import { Occurrence } from "../../../domain/occurrence/occurrence";
import { IOccurrenceRepository } from "../../../domain/occurrence/occurrence.repository";
import { EVENT_TOKENS } from "../../../event.tokens";
import { materializeOccurrenceDates } from "../../services/occurrence-materializer.service";

export class UpdateEventCommand extends TypedCommand<void> {
  constructor(
    public readonly props: {
      readonly eventId: string;
      readonly title?: string;
      readonly description?: string;
      readonly location?: string;
      readonly startDate?: Date;
      readonly endDate?: Date;
      readonly maxCapacity?: number;
      readonly recurrencePattern?: RecurrencePatternProps;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@CommandHandler(UpdateEventCommand)
@Injectable()
export class UpdateEventHandler implements ICommandHandler<UpdateEventCommand> {
  constructor(
    @Inject(EVENT_TOKENS.EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository,
    @Inject(EVENT_TOKENS.OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepo: IOccurrenceRepository,
    private readonly dateProvider: IDateProvider,
  ) {}

  async execute(command: UpdateEventCommand): Promise<void> {
    const { props } = command;
    const now = this.dateProvider.now();

    // Find the event — throws if not found or already deleted
    const event = await this.eventRepo.findById(props.eventId);
    if (event === null || event.isDeleted) {
      throw new EventNotFoundError(props.eventId, { correlationId: props.correlationId });
    }

    // Capture previous recurrence pattern before update
    const previousRecurrencePattern = event.recurrencePattern;

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

    // Build changes from non-undefined props
    const changes: Partial<{
      title: string;
      description: string;
      location: string;
      startDate: Date;
      endDate: Date;
      maxCapacity: number;
      recurrencePattern: RecurrencePatternProps;
    }> = {
      ...(props.title !== undefined && { title: props.title }),
      ...(props.description !== undefined && { description: props.description }),
      ...(props.location !== undefined && { location: props.location }),
      ...(props.startDate !== undefined && { startDate: props.startDate }),
      ...(props.endDate !== undefined && { endDate: props.endDate }),
      ...(props.maxCapacity !== undefined && { maxCapacity: props.maxCapacity }),
      ...(props.recurrencePattern !== undefined && { recurrencePattern: validatedPattern }),
    };

    // Apply changes to event entity
    event.update(changes, now);

    // Determine if recurrence pattern changed
    const previousPatternJson = JSON.stringify(previousRecurrencePattern ?? null);
    const newPatternJson = JSON.stringify(event.recurrencePattern ?? null);
    const recurrencePatternChanged = previousPatternJson !== newPatternJson;

    await this.eventRepo.withTransaction(async (session) => {
      if (recurrencePatternChanged) {
        // Case A: Recurrence pattern changed — wipe all occurrences and regenerate
        await this.eventRepo.save(event, session);
        await this.occurrenceRepo.deleteAllByEvent(event.id, session);

        if (event.recurrencePattern !== undefined) {
          const occurrenceDates = materializeOccurrenceDates(
            event.recurrencePattern,
            event.startDate,
          );
          const durationMs = differenceInMilliseconds(event.endDate, event.startDate);

          const newOccurrences = occurrenceDates.map((startDate) =>
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

          await this.occurrenceRepo.saveMany(newOccurrences, session);
        }
      } else if (event.isRecurring) {
        // Case B: Non-recurrence fields changed — propagate to future occurrences
        await this.eventRepo.save(event, session);

        // Build occurrence updates from only the changed fields that occurrences track
        const occurrenceUpdates: Partial<{
          title: string;
          location: string;
          maxCapacity: number;
          endDate: Date;
        }> = {};
        if (props.title !== undefined) occurrenceUpdates.title = event.title;
        if (props.location !== undefined && event.location !== undefined) {
          occurrenceUpdates.location = event.location;
        }
        if (props.maxCapacity !== undefined) occurrenceUpdates.maxCapacity = event.maxCapacity;
        if (props.endDate !== undefined) occurrenceUpdates.endDate = event.endDate;

        // Only call updateFutureByEvent if there are relevant field updates
        const hasOccurrenceUpdates = Object.keys(occurrenceUpdates).length > 0;
        if (hasOccurrenceUpdates) {
          await this.occurrenceRepo.updateFutureByEvent(event.id, now, occurrenceUpdates, session);
        }
      } else {
        // Case C: No recurrence, just save event (updatedAt advances)
        await this.eventRepo.save(event, session);
      }
    });
  }
}

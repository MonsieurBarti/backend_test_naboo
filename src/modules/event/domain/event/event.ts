import { AggregateRoot } from "@nestjs/cqrs";
import type { RecurrencePatternProps } from "src/modules/event/domain/event/recurrence-pattern";
import { recurrencePatternSchema } from "src/modules/event/domain/event/recurrence-pattern";
import { EventCreatedEvent } from "src/modules/event/domain/events/event-created.event";
import { EventDeletedEvent } from "src/modules/event/domain/events/event-deleted.event";
import { EventUpdatedEvent } from "src/modules/event/domain/events/event-updated.event";
import { IDateProvider } from "src/shared/date/date-provider";
import { ZodError, z } from "zod";

export const EventPropsSchema = z.object({
  id: z.uuid(),
  organizationId: z.uuid(),
  title: z.string(),
  description: z.string(),
  location: z.string().optional(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  maxCapacity: z.number().int(),
  recurrencePattern: recurrencePatternSchema.optional(),
  deletedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type EventProps = z.infer<typeof EventPropsSchema>;

export class Event extends AggregateRoot {
  private constructor(private props: EventProps) {
    super();
  }

  static createNew(
    props: Omit<EventProps, "deletedAt" | "createdAt" | "updatedAt">,
    dateProvider: IDateProvider,
  ): Event {
    const event = new Event(
      EventPropsSchema.parse({
        ...props,
        createdAt: dateProvider.now(),
        updatedAt: dateProvider.now(),
        deletedAt: undefined,
      }),
    );
    event.apply(
      new EventCreatedEvent({ aggregateId: event.id, organizationId: event.organizationId }),
    );
    return event;
  }

  static create(props: EventProps): Event {
    try {
      const validated = EventPropsSchema.parse(props);
      return new Event(validated);
    } catch (error) {
      if (error instanceof ZodError) throw error;
      throw error;
    }
  }

  softDelete(now: Date): void {
    this.props = { ...this.props, deletedAt: now };
    this.apply(
      new EventDeletedEvent({ aggregateId: this.id, organizationId: this.organizationId }),
    );
  }

  update(
    changes: Partial<
      Pick<
        EventProps,
        | "title"
        | "description"
        | "location"
        | "startDate"
        | "endDate"
        | "maxCapacity"
        | "recurrencePattern"
      >
    >,
    now: Date,
  ): void {
    this.props = { ...this.props, ...changes, updatedAt: now };
    this.apply(
      new EventUpdatedEvent({ aggregateId: this.id, organizationId: this.organizationId }),
    );
  }

  get id(): string {
    return this.props.id;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get title(): string {
    return this.props.title;
  }

  get description(): string {
    return this.props.description;
  }

  get location(): string | undefined {
    return this.props.location;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  get maxCapacity(): number {
    return this.props.maxCapacity;
  }

  get recurrencePattern(): RecurrencePatternProps | undefined {
    return this.props.recurrencePattern;
  }

  get deletedAt(): Date | undefined {
    return this.props.deletedAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== undefined;
  }

  get isRecurring(): boolean {
    return this.props.recurrencePattern !== undefined;
  }

  toJSON(): EventProps {
    return { ...this.props };
  }
}

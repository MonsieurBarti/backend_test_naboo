import { AggregateRoot } from "@nestjs/cqrs";
import { z } from "zod";
import type { RecurrencePatternProps } from "./recurrence-pattern";
import { recurrencePatternSchema } from "./recurrence-pattern";

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

  static create(props: Omit<EventProps, "deletedAt">): Event {
    return new Event(EventPropsSchema.parse({ ...props, deletedAt: undefined }));
  }

  static reconstitute(props: EventProps): Event {
    return new Event(EventPropsSchema.parse(props));
  }

  softDelete(now: Date): void {
    this.props = { ...this.props, deletedAt: now };
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
}

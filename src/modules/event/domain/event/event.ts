import { AggregateRoot } from "@nestjs/cqrs";
import type { RecurrencePatternProps } from "./recurrence-pattern";

export interface EventProps {
  readonly id: string;
  readonly organizationId: string;
  readonly title: string;
  readonly description: string;
  readonly location?: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly maxCapacity: number;
  readonly recurrencePattern?: RecurrencePatternProps;
  readonly deletedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Event extends AggregateRoot {
  private constructor(private props: EventProps) {
    super();
  }

  static create(props: Omit<EventProps, "deletedAt">): Event {
    return new Event({ ...props, deletedAt: undefined });
  }

  static reconstitute(props: EventProps): Event {
    return new Event(props);
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

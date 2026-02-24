import { AggregateRoot } from "@nestjs/cqrs";

export interface OccurrenceProps {
  readonly id: string;
  readonly eventId: string;
  readonly organizationId: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly title?: string;
  readonly location?: string;
  readonly maxCapacity?: number;
  readonly deletedAt?: Date;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class Occurrence extends AggregateRoot {
  private constructor(private props: OccurrenceProps) {
    super();
  }

  static create(props: Omit<OccurrenceProps, "deletedAt">): Occurrence {
    return new Occurrence({ ...props, deletedAt: undefined });
  }

  static reconstitute(props: OccurrenceProps): Occurrence {
    return new Occurrence(props);
  }

  softDelete(now: Date): void {
    this.props = { ...this.props, deletedAt: now };
  }

  update(
    changes: Partial<
      Pick<OccurrenceProps, "title" | "location" | "maxCapacity" | "startDate" | "endDate">
    >,
    now: Date,
  ): void {
    this.props = { ...this.props, ...changes, updatedAt: now };
  }

  get id(): string {
    return this.props.id;
  }

  get eventId(): string {
    return this.props.eventId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get startDate(): Date {
    return this.props.startDate;
  }

  get endDate(): Date {
    return this.props.endDate;
  }

  get title(): string | undefined {
    return this.props.title;
  }

  get location(): string | undefined {
    return this.props.location;
  }

  get maxCapacity(): number | undefined {
    return this.props.maxCapacity;
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
}

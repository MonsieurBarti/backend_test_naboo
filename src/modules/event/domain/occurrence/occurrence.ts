import { AggregateRoot } from "@nestjs/cqrs";
import {
  OccurrenceCapacityExceededError,
  SeatDecrementBelowZeroError,
} from "src/modules/event/domain/errors/event-base.error";
import { IDateProvider } from "src/shared/date/date-provider";
import { ZodError, z } from "zod";

export const OccurrencePropsSchema = z.object({
  id: z.uuid(),
  eventId: z.uuid(),
  organizationId: z.uuid(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  title: z.string().optional(),
  location: z.string().optional(),
  maxCapacity: z.number().int().optional(),
  registeredSeats: z.number().int().min(0).default(0),
  deletedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type OccurrenceProps = z.infer<typeof OccurrencePropsSchema>;

export class Occurrence extends AggregateRoot {
  private constructor(private props: OccurrenceProps) {
    super();
  }

  static createNew(
    props: Omit<OccurrenceProps, "deletedAt" | "registeredSeats" | "createdAt" | "updatedAt"> & {
      registeredSeats?: number;
    },
    dateProvider: IDateProvider,
  ): Occurrence {
    return new Occurrence(
      OccurrencePropsSchema.parse({
        ...props,
        createdAt: dateProvider.now(),
        updatedAt: dateProvider.now(),
        deletedAt: undefined,
      }),
    );
  }

  static create(props: OccurrenceProps): Occurrence {
    try {
      const validated = OccurrencePropsSchema.parse(props);
      return new Occurrence(validated);
    } catch (error) {
      if (error instanceof ZodError) throw error;
      throw error;
    }
  }

  incrementRegisteredSeats(count: number): void {
    if (
      this.props.maxCapacity !== undefined &&
      this.props.registeredSeats + count > this.props.maxCapacity
    ) {
      throw new OccurrenceCapacityExceededError(this.props.id);
    }
    this.props = { ...this.props, registeredSeats: this.props.registeredSeats + count };
  }

  decrementRegisteredSeats(count: number): void {
    if (this.props.registeredSeats - count < 0) {
      throw new SeatDecrementBelowZeroError(this.props.id);
    }
    this.props = { ...this.props, registeredSeats: this.props.registeredSeats - count };
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

  get registeredSeats(): number {
    return this.props.registeredSeats;
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

  toJSON(): OccurrenceProps {
    return { ...this.props };
  }
}

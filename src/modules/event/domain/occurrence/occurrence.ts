import { AggregateRoot } from "@nestjs/cqrs";
import { z } from "zod";

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

  static create(props: Omit<OccurrenceProps, "deletedAt" | "registeredSeats"> & { registeredSeats?: number }): Occurrence {
    return new Occurrence(OccurrencePropsSchema.parse({ ...props, deletedAt: undefined }));
  }

  static reconstitute(props: OccurrenceProps): Occurrence {
    return new Occurrence(OccurrencePropsSchema.parse(props));
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
}

import { AggregateRoot } from "@nestjs/cqrs";
import { RegistrationCancelledEvent } from "src/modules/registration/domain/events/registration-cancelled.event";
import { RegistrationCreatedEvent } from "src/modules/registration/domain/events/registration-created.event";
import { RegistrationReactivatedEvent } from "src/modules/registration/domain/events/registration-reactivated.event";
import { IDateProvider } from "src/shared/date/date-provider";
import { ZodError, z } from "zod";

export const RegistrationPropsSchema = z.object({
  id: z.uuid(),
  occurrenceId: z.uuid(),
  organizationId: z.uuid(),
  userId: z.string().min(1),
  seatCount: z.number().int().min(1).max(10),
  status: z.enum(["active", "cancelled"]),
  occurrenceStartDate: z.coerce.date(),
  occurrenceEndDate: z.coerce.date(),
  eventTitle: z.string(),
  deletedAt: z.coerce.date().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

export type RegistrationProps = z.infer<typeof RegistrationPropsSchema>;
export type RegistrationStatus = RegistrationProps["status"];

export class Registration extends AggregateRoot {
  private constructor(private props: RegistrationProps) {
    super();
  }

  static createNew(
    props: Omit<RegistrationProps, "deletedAt" | "status" | "createdAt" | "updatedAt">,
    dateProvider: IDateProvider,
  ): Registration {
    const registration = new Registration(
      RegistrationPropsSchema.parse({
        ...props,
        status: "active",
        deletedAt: undefined,
        createdAt: dateProvider.now(),
        updatedAt: dateProvider.now(),
      }),
    );
    registration.apply(
      new RegistrationCreatedEvent({
        aggregateId: registration.id,
        organizationId: registration.organizationId,
        occurrenceId: registration.occurrenceId,
      }),
    );
    return registration;
  }

  static create(props: RegistrationProps): Registration {
    try {
      const validated = RegistrationPropsSchema.parse(props);
      return new Registration(validated);
    } catch (error) {
      if (error instanceof ZodError) throw error;
      throw error;
    }
  }

  cancel(now: Date): void {
    this.props = {
      ...this.props,
      status: "cancelled",
      deletedAt: now,
      updatedAt: now,
    };
    this.apply(
      new RegistrationCancelledEvent({
        aggregateId: this.id,
        organizationId: this.organizationId,
        occurrenceId: this.occurrenceId,
      }),
    );
  }

  reactivate(seatCount: number, now: Date): void {
    this.props = {
      ...this.props,
      status: "active",
      deletedAt: undefined,
      seatCount,
      updatedAt: now,
    };
    this.apply(
      new RegistrationReactivatedEvent({
        aggregateId: this.id,
        organizationId: this.organizationId,
        occurrenceId: this.occurrenceId,
      }),
    );
  }

  updateSeatCount(seatCount: number, now: Date): void {
    this.props = {
      ...this.props,
      seatCount,
      updatedAt: now,
    };
  }

  get id(): string {
    return this.props.id;
  }

  get occurrenceId(): string {
    return this.props.occurrenceId;
  }

  get organizationId(): string {
    return this.props.organizationId;
  }

  get userId(): string {
    return this.props.userId;
  }

  get seatCount(): number {
    return this.props.seatCount;
  }

  get status(): RegistrationStatus {
    return this.props.status;
  }

  get occurrenceStartDate(): Date {
    return this.props.occurrenceStartDate;
  }

  get occurrenceEndDate(): Date {
    return this.props.occurrenceEndDate;
  }

  get eventTitle(): string {
    return this.props.eventTitle;
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

  get isActive(): boolean {
    return this.props.status === "active";
  }

  get isDeleted(): boolean {
    return this.props.deletedAt !== undefined;
  }

  toJSON(): RegistrationProps {
    return { ...this.props };
  }
}

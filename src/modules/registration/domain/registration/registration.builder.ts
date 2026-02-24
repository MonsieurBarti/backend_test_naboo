import { faker } from "@faker-js/faker";
import { Registration } from "./registration";

export class RegistrationBuilder {
  private id: string = faker.string.uuid();
  private occurrenceId: string = faker.string.uuid();
  private organizationId: string = faker.string.uuid();
  private userId: string = faker.string.uuid();
  private seatCount: number = faker.number.int({ min: 1, max: 5 });
  private status: "active" | "cancelled" = "active";
  private occurrenceStartDate: Date = faker.date.soon({ days: 7 });
  private occurrenceEndDate: Date = faker.date.soon({ days: 8 });
  private eventTitle: string = faker.lorem.words(3);
  private deletedAt: Date | undefined = undefined;
  private createdAt: Date = faker.date.past();
  private updatedAt: Date = faker.date.recent();

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withOccurrenceId(occurrenceId: string): this {
    this.occurrenceId = occurrenceId;
    return this;
  }

  withOrganizationId(organizationId: string): this {
    this.organizationId = organizationId;
    return this;
  }

  withUserId(userId: string): this {
    this.userId = userId;
    return this;
  }

  withSeatCount(seatCount: number): this {
    this.seatCount = seatCount;
    return this;
  }

  withStatus(status: "active" | "cancelled"): this {
    this.status = status;
    return this;
  }

  withEventTitle(eventTitle: string): this {
    this.eventTitle = eventTitle;
    return this;
  }

  withOccurrenceTimeWindow(start: Date, end: Date): this {
    this.occurrenceStartDate = start;
    this.occurrenceEndDate = end;
    return this;
  }

  asCancelled(deletedAt?: Date): this {
    this.status = "cancelled";
    this.deletedAt = deletedAt ?? new Date();
    return this;
  }

  build(): Registration {
    return Registration.create({
      id: this.id,
      occurrenceId: this.occurrenceId,
      organizationId: this.organizationId,
      userId: this.userId,
      seatCount: this.seatCount,
      status: this.status,
      occurrenceStartDate: this.occurrenceStartDate,
      occurrenceEndDate: this.occurrenceEndDate,
      eventTitle: this.eventTitle,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}

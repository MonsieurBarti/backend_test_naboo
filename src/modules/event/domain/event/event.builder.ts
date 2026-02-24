import { faker } from "@faker-js/faker";
import { Event } from "./event";
import type { RecurrencePatternProps } from "./recurrence-pattern";

export class EventBuilder {
  private id: string = faker.string.uuid();
  private organizationId: string = faker.string.uuid();
  private title: string = faker.lorem.words(3);
  private description: string = faker.lorem.sentence();
  private location: string | undefined = undefined;
  private startDate: Date = faker.date.soon({ days: 7 });
  private endDate: Date = faker.date.soon({ days: 14 });
  private maxCapacity: number = faker.number.int({ min: 10, max: 500 });
  private recurrencePattern: RecurrencePatternProps | undefined = undefined;
  private deletedAt: Date | undefined = undefined;
  private createdAt: Date = faker.date.past();
  private updatedAt: Date = faker.date.recent();

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withOrganizationId(organizationId: string): this {
    this.organizationId = organizationId;
    return this;
  }

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withStartDate(startDate: Date): this {
    this.startDate = startDate;
    return this;
  }

  withEndDate(endDate: Date): this {
    this.endDate = endDate;
    return this;
  }

  withMaxCapacity(maxCapacity: number): this {
    this.maxCapacity = maxCapacity;
    return this;
  }

  withRecurrencePattern(recurrencePattern: RecurrencePatternProps): this {
    this.recurrencePattern = recurrencePattern;
    return this;
  }

  asDeleted(deletedAt?: Date): this {
    this.deletedAt = deletedAt ?? new Date();
    return this;
  }

  build(): Event {
    return Event.create({
      id: this.id,
      organizationId: this.organizationId,
      title: this.title,
      description: this.description,
      location: this.location,
      startDate: this.startDate,
      endDate: this.endDate,
      maxCapacity: this.maxCapacity,
      recurrencePattern: this.recurrencePattern,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}

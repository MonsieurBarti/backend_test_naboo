import { faker } from "@faker-js/faker";
import { Occurrence } from "./occurrence";

export class OccurrenceBuilder {
  private id: string = faker.string.uuid();
  private eventId: string = faker.string.uuid();
  private organizationId: string = faker.string.uuid();
  private startDate: Date = faker.date.soon({ days: 7 });
  private endDate: Date = faker.date.soon({ days: 14 });
  private title: string | undefined = undefined;
  private location: string | undefined = undefined;
  private maxCapacity: number | undefined = undefined;
  private registeredSeats: number = 0;
  private deletedAt: Date | undefined = undefined;
  private createdAt: Date = faker.date.past();
  private updatedAt: Date = faker.date.recent();

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withEventId(eventId: string): this {
    this.eventId = eventId;
    return this;
  }

  withOrganizationId(organizationId: string): this {
    this.organizationId = organizationId;
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

  withTitle(title: string): this {
    this.title = title;
    return this;
  }

  withOverrides(overrides: { title?: string; location?: string; maxCapacity?: number }): this {
    if (overrides.title !== undefined) this.title = overrides.title;
    if (overrides.location !== undefined) this.location = overrides.location;
    if (overrides.maxCapacity !== undefined) this.maxCapacity = overrides.maxCapacity;
    return this;
  }

  asDeleted(deletedAt?: Date): this {
    this.deletedAt = deletedAt ?? new Date();
    return this;
  }

  withRegisteredSeats(registeredSeats: number): this {
    this.registeredSeats = registeredSeats;
    return this;
  }

  build(): Occurrence {
    return Occurrence.create({
      id: this.id,
      eventId: this.eventId,
      organizationId: this.organizationId,
      startDate: this.startDate,
      endDate: this.endDate,
      title: this.title,
      location: this.location,
      maxCapacity: this.maxCapacity,
      registeredSeats: this.registeredSeats,
      deletedAt: this.deletedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    });
  }
}

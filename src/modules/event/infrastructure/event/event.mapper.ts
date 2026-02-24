import type { EntityMapper } from "../../../../shared/db/mongoose-repository.base";
import { Event } from "../../domain/event/event";
import type { EventDocument } from "./event.schema";

export class EventMapper implements EntityMapper<Event, EventDocument> {
  toDomain(record: EventDocument): Event {
    return Event.create({
      id: record._id,
      organizationId: record.organizationId,
      title: record.title,
      description: record.description,
      location: record.location ?? undefined,
      startDate: record.startDate,
      endDate: record.endDate,
      maxCapacity: record.maxCapacity,
      recurrencePattern: record.recurrencePattern ?? undefined,
      deletedAt: record.deletedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toPersistence(entity: Event): EventDocument {
    return {
      _id: entity.id,
      organizationId: entity.organizationId,
      title: entity.title,
      description: entity.description,
      location: entity.location ?? null,
      startDate: entity.startDate,
      endDate: entity.endDate,
      maxCapacity: entity.maxCapacity,
      recurrencePattern: entity.recurrencePattern ?? null,
      deletedAt: entity.deletedAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

import type { EntityMapper } from "../../../../shared/db/mongoose-repository.base";
import { Occurrence } from "../../domain/occurrence/occurrence";
import type { OccurrenceDocument } from "./occurrence.schema";

export class OccurrenceMapper implements EntityMapper<Occurrence, OccurrenceDocument> {
  toDomain(record: OccurrenceDocument): Occurrence {
    return Occurrence.reconstitute({
      id: record._id,
      eventId: record.eventId,
      organizationId: record.organizationId,
      startDate: record.startDate,
      endDate: record.endDate,
      title: record.title ?? undefined,
      location: record.location ?? undefined,
      maxCapacity: record.maxCapacity ?? undefined,
      registeredSeats: record.registeredSeats,
      deletedAt: record.deletedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toPersistence(entity: Occurrence): OccurrenceDocument {
    return {
      _id: entity.id,
      eventId: entity.eventId,
      organizationId: entity.organizationId,
      startDate: entity.startDate,
      endDate: entity.endDate,
      title: entity.title ?? null,
      location: entity.location ?? null,
      maxCapacity: entity.maxCapacity ?? null,
      registeredSeats: entity.registeredSeats,
      deletedAt: entity.deletedAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

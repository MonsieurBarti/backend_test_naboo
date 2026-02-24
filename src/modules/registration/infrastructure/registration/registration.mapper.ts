import type { EntityMapper } from "../../../../shared/db/mongoose-repository.base";
import { Registration } from "../../domain/registration/registration";
import type { RegistrationDocument } from "./registration.schema";

export class RegistrationMapper implements EntityMapper<Registration, RegistrationDocument> {
  toDomain(record: RegistrationDocument): Registration {
    return Registration.reconstitute({
      id: record._id,
      occurrenceId: record.occurrenceId,
      organizationId: record.organizationId,
      userId: record.userId,
      seatCount: record.seatCount,
      status: record.status,
      occurrenceStartDate: record.occurrenceStartDate,
      occurrenceEndDate: record.occurrenceEndDate,
      eventTitle: record.eventTitle,
      deletedAt: record.deletedAt ?? undefined,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  toPersistence(entity: Registration): RegistrationDocument {
    return {
      _id: entity.id,
      occurrenceId: entity.occurrenceId,
      organizationId: entity.organizationId,
      userId: entity.userId,
      seatCount: entity.seatCount,
      status: entity.status,
      occurrenceStartDate: entity.occurrenceStartDate,
      occurrenceEndDate: entity.occurrenceEndDate,
      eventTitle: entity.eventTitle,
      deletedAt: entity.deletedAt ?? null,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }
}

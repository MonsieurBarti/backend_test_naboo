import type { ClientSession } from "mongoose";
import type { CursorPaginatedResult } from "../../../event/domain/event/event.repository";
import type { Registration } from "./registration";

export abstract class IRegistrationRepository {
  abstract save(registration: Registration, session?: ClientSession): Promise<void>;
  abstract findByUserAndOccurrence(
    userId: string,
    occurrenceId: string,
  ): Promise<Registration | null>;
  abstract findOverlappingRegistrations(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeRegistrationId?: string,
  ): Promise<Registration[]>;
  abstract findByUserInOrganization(params: {
    userId: string;
    organizationId: string;
    includeCancelled?: boolean;
    first: number;
    after?: string;
  }): Promise<CursorPaginatedResult<Registration>>;
  abstract withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T>;
}

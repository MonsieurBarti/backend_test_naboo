import type { ClientSession } from "mongoose";
import type { Event } from "./event";

export type CursorPaginatedResult<T> = {
  items: T[];
  hasNextPage: boolean;
  totalCount: number;
};

export abstract class IEventRepository {
  abstract save(event: Event, session?: ClientSession): Promise<void>;
  abstract findById(id: string, session?: ClientSession): Promise<Event | null>;
  abstract findByOrganization(params: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
    first: number;
    after?: string;
  }): Promise<CursorPaginatedResult<Event>>;
  abstract softDelete(event: Event, session?: ClientSession): Promise<void>;
  abstract withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T>;
}

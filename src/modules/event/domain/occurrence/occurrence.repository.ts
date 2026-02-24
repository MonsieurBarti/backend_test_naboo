import type { ClientSession } from "mongoose";
import type { CursorPaginatedResult } from "../event/event.repository";
import type { Occurrence } from "./occurrence";

export abstract class IOccurrenceRepository {
  abstract findById(id: string, session?: ClientSession): Promise<Occurrence | null>;
  abstract save(occurrence: Occurrence, session?: ClientSession): Promise<void>;
  abstract saveMany(occurrences: Occurrence[], session?: ClientSession): Promise<void>;
  abstract findByEvent(
    eventId: string,
    params: {
      startDate?: Date;
      endDate?: Date;
      first: number;
      after?: string;
    },
  ): Promise<CursorPaginatedResult<Occurrence>>;
  abstract softDeleteByEvent(eventId: string, now: Date, session?: ClientSession): Promise<void>;
  abstract deleteAllByEvent(eventId: string, session?: ClientSession): Promise<void>;
  abstract updateFutureByEvent(
    eventId: string,
    since: Date,
    updates: Partial<{
      title: string;
      location: string;
      maxCapacity: number;
      endDate: Date;
    }>,
    session?: ClientSession,
  ): Promise<void>;
}

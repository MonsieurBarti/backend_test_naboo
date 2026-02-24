import type { ClientSession } from "mongoose";

export type OccurrenceReadModel = {
  id: string;
  eventId: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  maxCapacity: number | undefined;
  registeredSeats: number;
  deletedAt: Date | undefined;
};

export type EventReadModel = {
  id: string;
  title: string;
  isDeleted: boolean;
};

export abstract class IEventModuleInProc {
  abstract findOccurrenceById(
    id: string,
    session?: ClientSession,
  ): Promise<OccurrenceReadModel | null>;

  abstract findEventById(id: string, session?: ClientSession): Promise<EventReadModel | null>;

  abstract reserveSeats(
    occurrenceId: string,
    count: number,
    session?: ClientSession,
  ): Promise<void>;

  abstract releaseSeats(
    occurrenceId: string,
    count: number,
    session?: ClientSession,
  ): Promise<void>;
}

import { Inject, Injectable } from "@nestjs/common";
import type { ClientSession } from "mongoose";
import {
  type EventReadModel,
  IEventModuleInProc,
  type OccurrenceReadModel,
} from "../../../../shared/in-proc/event-module.in-proc";
import { IEventRepository } from "../../domain/event/event.repository";
import { IOccurrenceRepository } from "../../domain/occurrence/occurrence.repository";
import { EVENT_TOKENS } from "../../event.tokens";

@Injectable()
export class EventModuleInProcImpl extends IEventModuleInProc {
  constructor(
    @Inject(EVENT_TOKENS.OCCURRENCE_REPOSITORY)
    private readonly occurrenceRepo: IOccurrenceRepository,
    @Inject(EVENT_TOKENS.EVENT_REPOSITORY)
    private readonly eventRepo: IEventRepository,
  ) {
    super();
  }

  async findOccurrenceById(
    id: string,
    session?: ClientSession,
  ): Promise<OccurrenceReadModel | null> {
    const occurrence = await this.occurrenceRepo.findById(id, session);
    if (occurrence === null) return null;

    return {
      id: occurrence.id,
      eventId: occurrence.eventId,
      organizationId: occurrence.organizationId,
      startDate: occurrence.startDate,
      endDate: occurrence.endDate,
      maxCapacity: occurrence.maxCapacity,
      registeredSeats: occurrence.registeredSeats,
      deletedAt: occurrence.deletedAt,
    };
  }

  async findEventById(id: string, session?: ClientSession): Promise<EventReadModel | null> {
    const event = await this.eventRepo.findById(id, session);
    if (event === null) return null;

    return {
      id: event.id,
      title: event.title,
      isDeleted: event.isDeleted,
    };
  }

  async reserveSeats(occurrenceId: string, count: number, session?: ClientSession): Promise<void> {
    const occurrence = await this.occurrenceRepo.findById(occurrenceId, session);
    if (occurrence === null) return;

    occurrence.incrementRegisteredSeats(count);
    await this.occurrenceRepo.save(occurrence, session);
  }

  async releaseSeats(occurrenceId: string, count: number, session?: ClientSession): Promise<void> {
    const occurrence = await this.occurrenceRepo.findById(occurrenceId, session);
    if (occurrence === null) return;

    occurrence.decrementRegisteredSeats(count);
    await this.occurrenceRepo.save(occurrence, session);
  }
}

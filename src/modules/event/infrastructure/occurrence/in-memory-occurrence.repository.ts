import { Injectable } from "@nestjs/common";
import type { ClientSession } from "mongoose";
import { InMemoryRepositoryBase } from "../../../../shared/db/in-memory-repository.base";
import type { CursorPaginatedResult } from "../../domain/event/event.repository";
import { Occurrence } from "../../domain/occurrence/occurrence";
import { IOccurrenceRepository } from "../../domain/occurrence/occurrence.repository";

@Injectable()
export class InMemoryOccurrenceRepository
  extends InMemoryRepositoryBase<Occurrence>
  implements IOccurrenceRepository
{
  protected getId(entity: Occurrence): string {
    return entity.id;
  }

  protected publishEvents(_entity: Occurrence): void {
    // no-op in test double
  }

  override async findById(id: string, _session?: ClientSession): Promise<Occurrence | null> {
    return this.store.get(id) ?? null;
  }

  override async save(occurrence: Occurrence, _session?: ClientSession): Promise<void> {
    this.store.set(occurrence.id, occurrence);
  }

  async saveMany(occurrences: Occurrence[], _session?: ClientSession): Promise<void> {
    for (const occ of occurrences) {
      this.store.set(occ.id, occ);
    }
  }

  async findByEvent(
    eventId: string,
    params: {
      startDate?: Date;
      endDate?: Date;
      first: number;
      after?: string;
    },
  ): Promise<CursorPaginatedResult<Occurrence>> {
    const { startDate, endDate, first } = params;

    const all = Array.from(this.store.values()).filter((occ) => {
      if (occ.eventId !== eventId) return false;
      if (occ.deletedAt !== undefined) return false;
      if (startDate && occ.startDate < startDate) return false;
      if (endDate && occ.endDate > endDate) return false;
      return true;
    });

    all.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const totalCount = all.length;
    const slice = all.slice(0, first + 1);
    const hasNextPage = slice.length > first;
    if (hasNextPage) slice.pop();

    return { items: slice, hasNextPage, totalCount };
  }

  async softDeleteByEvent(eventId: string, now: Date, _session?: ClientSession): Promise<void> {
    for (const [id, occ] of this.store.entries()) {
      if (occ.eventId === eventId && occ.deletedAt === undefined) {
        occ.softDelete(now);
        this.store.set(id, occ);
      }
    }
  }

  async deleteAllByEvent(eventId: string, _session?: ClientSession): Promise<void> {
    for (const [id, occ] of this.store.entries()) {
      if (occ.eventId === eventId) {
        this.store.delete(id);
      }
    }
  }

  async updateFutureByEvent(
    eventId: string,
    since: Date,
    updates: Partial<{
      title: string;
      location: string;
      maxCapacity: number;
      endDate: Date;
    }>,
    _session?: ClientSession,
  ): Promise<void> {
    const now = new Date();
    for (const [id, occ] of this.store.entries()) {
      if (occ.eventId === eventId && occ.startDate >= since && occ.deletedAt === undefined) {
        occ.update(updates, now);
        this.store.set(id, occ);
      }
    }
  }
}

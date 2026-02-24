import { Injectable } from "@nestjs/common";
import type { ClientSession } from "mongoose";
import { InMemoryRepositoryBase } from "../../../../shared/db/in-memory-repository.base";
import { Event } from "../../domain/event/event";
import type { CursorPaginatedResult } from "../../domain/event/event.repository";
import { IEventRepository } from "../../domain/event/event.repository";

@Injectable()
export class InMemoryEventRepository
  extends InMemoryRepositoryBase<Event>
  implements IEventRepository
{
  protected getId(entity: Event): string {
    return entity.id;
  }

  protected publishEvents(_entity: Event): void {
    // no-op in test double
  }

  async findByOrganization(params: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
    first: number;
    after?: string;
  }): Promise<CursorPaginatedResult<Event>> {
    const { organizationId, startDate, endDate, first } = params;

    const all = Array.from(this.store.values()).filter((event) => {
      if (event.organizationId !== organizationId) return false;
      if (event.deletedAt !== undefined) return false;
      if (startDate && event.startDate < startDate) return false;
      if (endDate && event.endDate > endDate) return false;
      return true;
    });

    all.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const totalCount = all.length;
    const slice = all.slice(0, first + 1);
    const hasNextPage = slice.length > first;
    if (hasNextPage) slice.pop();

    return { items: slice, hasNextPage, totalCount };
  }

  async withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
    // In-memory test double: executes fn directly without a real session
    return fn(undefined);
  }
}

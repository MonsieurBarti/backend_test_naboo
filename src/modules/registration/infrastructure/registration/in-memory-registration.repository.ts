import { Injectable } from "@nestjs/common";
import type { ClientSession } from "mongoose";
import { InMemoryRepositoryBase } from "../../../../shared/db/in-memory-repository.base";
import type { CursorPaginatedResult } from "../../../event/domain/event/event.repository";
import { Registration } from "../../domain/registration/registration";
import { IRegistrationRepository } from "../../domain/registration/registration.repository";

@Injectable()
export class InMemoryRegistrationRepository
  extends InMemoryRepositoryBase<Registration>
  implements IRegistrationRepository
{
  protected getId(entity: Registration): string {
    return entity.id;
  }

  protected publishEvents(_entity: Registration): void {
    // no-op in test double
  }

  override async findById(id: string, _session?: ClientSession): Promise<Registration | null> {
    return this.store.get(id) ?? null;
  }

  async findByUserAndOccurrence(
    userId: string,
    occurrenceId: string,
  ): Promise<Registration | null> {
    for (const reg of this.store.values()) {
      if (reg.userId === userId && reg.occurrenceId === occurrenceId) {
        return reg;
      }
    }
    return null;
  }

  async findOverlappingRegistrations(
    userId: string,
    startDate: Date,
    endDate: Date,
    excludeRegistrationId?: string,
  ): Promise<Registration[]> {
    const results: Registration[] = [];
    for (const reg of this.store.values()) {
      if (reg.userId !== userId) continue;
      if (reg.status !== "active") continue;
      if (excludeRegistrationId !== undefined && reg.id === excludeRegistrationId) continue;
      if (reg.occurrenceStartDate >= endDate) continue;
      if (reg.occurrenceEndDate <= startDate) continue;
      results.push(reg);
    }
    return results;
  }

  async findByUserInOrganization(params: {
    userId: string;
    organizationId: string;
    includeCancelled?: boolean;
    first: number;
    after?: string;
  }): Promise<CursorPaginatedResult<Registration>> {
    const { userId, organizationId, includeCancelled, first, after } = params;

    const all = Array.from(this.store.values()).filter((reg) => {
      if (reg.userId !== userId) return false;
      if (reg.organizationId !== organizationId) return false;
      if (!includeCancelled && reg.status !== "active") return false;
      return true;
    });

    all.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

    const totalCount = all.length;

    let slice = all;
    if (after !== undefined) {
      const afterDecoded = Buffer.from(after, "base64").toString("utf-8");
      const startIdx = all.findIndex((r) => r.id > afterDecoded);
      slice = startIdx === -1 ? [] : all.slice(startIdx);
    }

    const page = slice.slice(0, first + 1);
    const hasNextPage = page.length > first;
    if (hasNextPage) page.pop();

    return { items: page, hasNextPage, totalCount };
  }

  async withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
    return fn(undefined);
  }
}

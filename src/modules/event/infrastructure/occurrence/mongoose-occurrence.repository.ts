import { Injectable } from "@nestjs/common";
import { AggregateRoot, EventBus } from "@nestjs/cqrs";
import type { ClientSession } from "mongoose";
import { ClsService } from "nestjs-cls";
import type { EntityMapper } from "../../../../shared/db/mongoose-repository.base";
import { TenantConnectionRegistry } from "../../../../shared/mongoose/tenant-connection-registry";
import type { CursorPaginatedResult } from "../../domain/event/event.repository";
import { Occurrence } from "../../domain/occurrence/occurrence";
import { IOccurrenceRepository } from "../../domain/occurrence/occurrence.repository";
import { OccurrenceMapper } from "./occurrence.mapper";
import type { OccurrenceDocument } from "./occurrence.schema";
import { OccurrenceSchema } from "./occurrence.schema";

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}

@Injectable()
export class MongooseOccurrenceRepository implements IOccurrenceRepository {
  protected readonly mapper: EntityMapper<Occurrence, OccurrenceDocument> = new OccurrenceMapper();

  constructor(
    private readonly registry: TenantConnectionRegistry,
    private readonly cls: ClsService,
    private readonly eventBus: EventBus,
  ) {}

  private getModel() {
    const tenantSlug = this.cls.get<string>("tenantSlug");
    return this.registry.getModel(tenantSlug, "occurrences", OccurrenceSchema);
  }

  async saveMany(occurrences: Occurrence[], session?: ClientSession): Promise<void> {
    const docs = occurrences.map((occ) => this.mapper.toPersistence(occ));
    await this.getModel().insertMany(docs, { session });
    for (const occ of occurrences) {
      this.publishEvents(occ);
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
    const { startDate, endDate, first, after } = params;
    const model = this.getModel();

    const baseFilter: Record<string, unknown> = {
      eventId,
      deletedAt: null,
      ...(startDate ? { startDate: { $gte: startDate } } : {}),
      ...(endDate ? { endDate: { $lte: endDate } } : {}),
      ...(after ? { _id: { $gt: decodeCursor(after) } } : {}),
    };

    const [docs, totalCount] = await Promise.all([
      model
        .find(baseFilter)
        .sort({ _id: 1 })
        .limit(first + 1)
        .lean<OccurrenceDocument[]>()
        .exec(),
      model
        .countDocuments({
          eventId,
          deletedAt: null,
          ...(startDate ? { startDate: { $gte: startDate } } : {}),
          ...(endDate ? { endDate: { $lte: endDate } } : {}),
        })
        .exec(),
    ]);

    const hasNextPage = docs.length > first;
    if (hasNextPage) docs.pop();

    return {
      items: docs.map((doc) => this.mapper.toDomain(doc)),
      hasNextPage,
      totalCount,
    };
  }

  async softDeleteByEvent(eventId: string, now: Date, session?: ClientSession): Promise<void> {
    await this.getModel().updateMany(
      { eventId, deletedAt: null },
      { $set: { deletedAt: now } },
      { session },
    );
  }

  async deleteAllByEvent(eventId: string, session?: ClientSession): Promise<void> {
    await this.getModel().deleteMany({ eventId }, { session });
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
    session?: ClientSession,
  ): Promise<void> {
    await this.getModel().updateMany(
      { eventId, startDate: { $gte: since }, deletedAt: null },
      { $set: updates },
      { session },
    );
  }

  private publishEvents(entity: AggregateRoot): void {
    const events = entity.getUncommittedEvents();
    if (events.length > 0) {
      this.eventBus.publishAll(events);
      entity.uncommit();
    }
  }
}

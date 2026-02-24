import { Injectable } from "@nestjs/common";
import { AggregateRoot, EventBus } from "@nestjs/cqrs";
import type { ClientSession } from "mongoose";
import { ClsService } from "nestjs-cls";
import type { EntityMapper } from "../../../../shared/db/mongoose-repository.base";
import { TenantConnectionRegistry } from "../../../../shared/mongoose/tenant-connection-registry";
import { Event } from "../../domain/event/event";
import type { CursorPaginatedResult } from "../../domain/event/event.repository";
import { IEventRepository } from "../../domain/event/event.repository";
import { EventMapper } from "./event.mapper";
import type { EventDocument } from "./event.schema";
import { EventSchema } from "./event.schema";

function encodeCursor(id: string): string {
  return Buffer.from(id).toString("base64");
}

function decodeCursor(cursor: string): string {
  return Buffer.from(cursor, "base64").toString("utf-8");
}

@Injectable()
export class MongooseEventRepository implements IEventRepository {
  protected readonly mapper: EntityMapper<Event, EventDocument> = new EventMapper();

  constructor(
    private readonly registry: TenantConnectionRegistry,
    private readonly cls: ClsService,
    private readonly eventBus: EventBus,
  ) {}

  private getModel() {
    const tenantSlug = this.cls.get<string>("tenantSlug");
    return this.registry.getModel(tenantSlug, "events", EventSchema);
  }

  async save(entity: Event, session?: ClientSession): Promise<void> {
    const doc = this.mapper.toPersistence(entity);
    await this.getModel().findOneAndUpdate(
      { _id: doc._id },
      { $set: doc },
      { upsert: true, new: true, session },
    );
    this.publishEvents(entity);
  }

  async findById(id: string, session?: ClientSession): Promise<Event | null> {
    const doc = await this.getModel().findById(id, null, { session }).lean<EventDocument>().exec();
    return doc ? this.mapper.toDomain(doc) : null;
  }

  async findByOrganization(params: {
    organizationId: string;
    startDate?: Date;
    endDate?: Date;
    first: number;
    after?: string;
  }): Promise<CursorPaginatedResult<Event>> {
    const { organizationId, startDate, endDate, first, after } = params;
    const model = this.getModel();

    const baseFilter: Record<string, unknown> = {
      organizationId,
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
        .lean<EventDocument[]>()
        .exec(),
      model
        .countDocuments({
          organizationId,
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

  async withTransaction<T>(fn: (session?: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.getModel().db.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  private publishEvents(entity: AggregateRoot): void {
    const events = entity.getUncommittedEvents();
    if (events.length > 0) {
      this.eventBus.publishAll(events);
      entity.uncommit();
    }
  }

  static encodeCursor(id: string): string {
    return encodeCursor(id);
  }
}

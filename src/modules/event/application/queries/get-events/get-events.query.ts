import { Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ClsService } from "nestjs-cls";
import { TypedQuery } from "../../../../../shared/cqrs/typed-query";
import { decodeCursor } from "../../../../../shared/graphql/relay-pagination";
import { TenantConnectionRegistry } from "../../../../../shared/mongoose/tenant-connection-registry";
import { CacheService } from "../../../../../shared/redis/cache.service";
import type { RecurrencePatternProps } from "../../../domain/event/recurrence-pattern";
import { EventDocument, EventSchema } from "../../../infrastructure/event/event.schema";

export interface EventReadModel {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  location: string | null;
  startDate: Date;
  endDate: Date;
  maxCapacity: number;
  recurrencePattern: RecurrencePatternProps | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetEventsQueryResult {
  items: EventReadModel[];
  hasNextPage: boolean;
  totalCount: number;
}

export class GetEventsQuery extends TypedQuery<GetEventsQueryResult> {
  constructor(
    public readonly props: {
      readonly startDate?: Date;
      readonly endDate?: Date;
      readonly first: number;
      readonly after?: string;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@QueryHandler(GetEventsQuery)
@Injectable()
export class GetEventsHandler implements IQueryHandler<GetEventsQuery, GetEventsQueryResult> {
  constructor(
    private readonly registry: TenantConnectionRegistry,
    private readonly cls: ClsService,
    private readonly cacheService: CacheService,
  ) {}

  private getModel() {
    const tenantSlug = this.cls.get<string>("tenantSlug");
    return this.registry.getModel<EventDocument>(tenantSlug, "events", EventSchema);
  }

  async execute(query: GetEventsQuery): Promise<GetEventsQueryResult> {
    const { props } = query;
    const { startDate, endDate, first, after } = props;

    const tenantId = this.cls.get<string>("tenantId");
    const stableHash = JSON.stringify({
      s: startDate?.toISOString(),
      e: endDate?.toISOString(),
      f: first,
      a: after,
    });
    const cacheKey = `${tenantId}:events:list:${stableHash}`;

    const cached = await this.cacheService.get<GetEventsQueryResult>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const dateFilters: Record<string, unknown> = {};
    if (startDate !== undefined) {
      dateFilters["startDate"] = { $gte: startDate };
    }
    if (endDate !== undefined) {
      dateFilters["endDate"] = { $lte: endDate };
    }

    const filter: Record<string, unknown> = {
      deletedAt: null,
      ...dateFilters,
    };

    if (after !== undefined) {
      filter["_id"] = { $gt: decodeCursor(after) };
    }

    const model = this.getModel();

    const results = await model
      .find(filter)
      .sort({ _id: 1 })
      .limit(first + 1)
      .lean<EventDocument[]>()
      .exec();

    const hasNextPage = results.length > first;
    if (hasNextPage) {
      results.pop();
    }

    const totalCount = await model.countDocuments({ deletedAt: null, ...dateFilters });

    const items: EventReadModel[] = results.map((doc) => ({
      id: doc._id,
      organizationId: doc.organizationId,
      title: doc.title,
      description: doc.description,
      location: doc.location,
      startDate: doc.startDate,
      endDate: doc.endDate,
      maxCapacity: doc.maxCapacity,
      recurrencePattern: doc.recurrencePattern,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    const result: GetEventsQueryResult = { items, hasNextPage, totalCount };
    await this.cacheService.set(cacheKey, result, 300);
    return result;
  }
}

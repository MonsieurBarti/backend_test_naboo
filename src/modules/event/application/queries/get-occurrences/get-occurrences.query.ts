import { Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ClsService } from "nestjs-cls";
import { TypedQuery } from "../../../../../shared/cqrs/typed-query";
import { decodeCursor } from "../../../../../shared/graphql/relay-pagination";
import { TenantConnectionRegistry } from "../../../../../shared/mongoose/tenant-connection-registry";
import { CacheService } from "../../../../../shared/redis/cache.service";
import {
  OccurrenceDocument,
  OccurrenceSchema,
} from "../../../infrastructure/occurrence/occurrence.schema";

export interface OccurrenceReadModel {
  id: string;
  eventId: string;
  organizationId: string;
  startDate: Date;
  endDate: Date;
  title: string | null;
  location: string | null;
  maxCapacity: number | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface GetOccurrencesQueryResult {
  items: OccurrenceReadModel[];
  hasNextPage: boolean;
  totalCount: number;
}

export class GetOccurrencesQuery extends TypedQuery<GetOccurrencesQueryResult> {
  constructor(
    public readonly props: {
      readonly eventId: string;
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

@QueryHandler(GetOccurrencesQuery)
@Injectable()
export class GetOccurrencesHandler
  implements IQueryHandler<GetOccurrencesQuery, GetOccurrencesQueryResult>
{
  constructor(
    private readonly registry: TenantConnectionRegistry,
    private readonly cls: ClsService,
    private readonly cacheService: CacheService,
  ) {}

  private getModel() {
    const tenantSlug = this.cls.get<string>("tenantSlug");
    return this.registry.getModel<OccurrenceDocument>(tenantSlug, "occurrences", OccurrenceSchema);
  }

  async execute(query: GetOccurrencesQuery): Promise<GetOccurrencesQueryResult> {
    const { props } = query;
    const { eventId, startDate, endDate, first, after } = props;

    const tenantId = this.cls.get<string>("tenantId");
    const stableHash = JSON.stringify({
      s: startDate?.toISOString(),
      e: endDate?.toISOString(),
      f: first,
      a: after,
    });
    const cacheKey = `${tenantId}:occurrences:list:${eventId}:${stableHash}`;

    const cached = await this.cacheService.get<GetOccurrencesQueryResult>(cacheKey);
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
      eventId,
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
      .lean<OccurrenceDocument[]>()
      .exec();

    const hasNextPage = results.length > first;
    if (hasNextPage) {
      results.pop();
    }

    const totalCount = await model.countDocuments({ eventId, deletedAt: null, ...dateFilters });

    const items: OccurrenceReadModel[] = results.map((doc) => ({
      id: doc._id,
      eventId: doc.eventId,
      organizationId: doc.organizationId,
      startDate: doc.startDate,
      endDate: doc.endDate,
      title: doc.title,
      location: doc.location,
      maxCapacity: doc.maxCapacity,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    const result: GetOccurrencesQueryResult = { items, hasNextPage, totalCount };
    await this.cacheService.set(cacheKey, result, 120);
    return result;
  }
}

import { randomUUID } from "node:crypto";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { getConnectionToken, MongooseModule } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Connection, Model } from "mongoose";
import { ClsModule, ClsService } from "nestjs-cls";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { encodeCursor } from "../../../../../shared/graphql/relay-pagination";
import { TenantConnectionRegistry } from "../../../../../shared/mongoose/tenant-connection-registry";
import { CacheService } from "../../../../../shared/redis/cache.service";
import {
  generateTestTenantId,
  generateTestTenantSlug,
  truncateCollections,
} from "../../../../../shared/testing/mongodb.helper";
import { TestLoggerModule } from "../../../../../shared/testing/test-logger.module";
import type { OccurrenceDocument } from "../../../infrastructure/occurrence/occurrence.schema";
import { OccurrenceSchema } from "../../../infrastructure/occurrence/occurrence.schema";
import { GetOccurrencesHandler, GetOccurrencesQuery } from "./get-occurrences.query";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/test?replicaSet=rs0";

// Stub CacheService that always misses
class StubCacheService {
  async get<T>(_key: string): Promise<T | null> {
    return null;
  }

  async set(_key: string, _value: unknown, _ttl: number): Promise<void> {
    // no-op
  }

  async del(_key: string): Promise<void> {
    // no-op
  }

  async delPattern(_pattern: string): Promise<void> {
    // no-op
  }
}

describe("GetOccurrencesHandler (integration)", () => {
  let queryHandler: GetOccurrencesHandler;
  let cls: ClsService;
  let module: TestingModule;
  let connection: Connection;
  let tenantSlug: string;
  let tenantId: string;
  let occurrenceCollection: Model<OccurrenceDocument>;

  beforeAll(async () => {
    tenantSlug = generateTestTenantSlug();
    tenantId = generateTestTenantId();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(MONGODB_URI),
        TestLoggerModule,
        CqrsModule,
        ClsModule.forRoot({ global: true }),
      ],
      providers: [
        GetOccurrencesHandler,
        TenantConnectionRegistry,
        { provide: CacheService, useClass: StubCacheService },
      ],
    }).compile();

    connection = module.get<Connection>(getConnectionToken());
    cls = module.get(ClsService);
    queryHandler = module.get(GetOccurrencesHandler);

    await module.init();

    // Get the tenant-scoped collection model for seeding
    const registry = module.get(TenantConnectionRegistry);
    occurrenceCollection = registry.getModel<OccurrenceDocument>(
      tenantSlug,
      "occurrences",
      OccurrenceSchema,
    );
  });

  beforeEach(async () => {
    await truncateCollections(connection, [`${tenantSlug}_occurrences`]);
  });

  afterAll(async () => {
    await truncateCollections(connection, [`${tenantSlug}_occurrences`]);
    await module.close();
  });

  it("should return occurrences for specific event", async () => {
    const eventId1 = randomUUID();
    const eventId2 = randomUUID();

    await occurrenceCollection.create([
      {
        _id: randomUUID(),
        eventId: eventId1,
        organizationId: tenantId,
        startDate: new Date("2025-03-01T10:00:00"),
        endDate: new Date("2025-03-01T12:00:00"),
        title: "Occurrence E1-A",
        location: null,
        maxCapacity: 10,
        registeredSeats: 0,
        deletedAt: null,
      },
      {
        _id: randomUUID(),
        eventId: eventId1,
        organizationId: tenantId,
        startDate: new Date("2025-03-08T10:00:00"),
        endDate: new Date("2025-03-08T12:00:00"),
        title: "Occurrence E1-B",
        location: null,
        maxCapacity: 10,
        registeredSeats: 0,
        deletedAt: null,
      },
      {
        _id: randomUUID(),
        eventId: eventId2,
        organizationId: tenantId,
        startDate: new Date("2025-03-05T10:00:00"),
        endDate: new Date("2025-03-05T12:00:00"),
        title: "Occurrence E2-A",
        location: null,
        maxCapacity: 5,
        registeredSeats: 0,
        deletedAt: null,
      },
    ]);

    const result = await cls.run(async () => {
      cls.set("tenantId", tenantId);
      cls.set("tenantSlug", tenantSlug);
      return queryHandler.execute(
        new GetOccurrencesQuery({
          eventId: eventId1,
          first: 20,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    for (const item of result.items) {
      expect(item.eventId).toBe(eventId1);
    }
  });

  it("should filter by date range", async () => {
    const eventId = randomUUID();

    await occurrenceCollection.create([
      {
        _id: randomUUID(),
        eventId,
        organizationId: tenantId,
        startDate: new Date("2025-01-10T10:00:00"),
        endDate: new Date("2025-01-10T12:00:00"),
        title: "January occurrence",
        location: null,
        maxCapacity: 10,
        registeredSeats: 0,
        deletedAt: null,
      },
      {
        _id: randomUUID(),
        eventId,
        organizationId: tenantId,
        startDate: new Date("2025-05-10T10:00:00"),
        endDate: new Date("2025-05-10T12:00:00"),
        title: "May occurrence",
        location: null,
        maxCapacity: 10,
        registeredSeats: 0,
        deletedAt: null,
      },
      {
        _id: randomUUID(),
        eventId,
        organizationId: tenantId,
        startDate: new Date("2025-11-10T10:00:00"),
        endDate: new Date("2025-11-10T12:00:00"),
        title: "November occurrence",
        location: null,
        maxCapacity: 10,
        registeredSeats: 0,
        deletedAt: null,
      },
    ]);

    const result = await cls.run(async () => {
      cls.set("tenantId", tenantId);
      cls.set("tenantSlug", tenantSlug);
      return queryHandler.execute(
        new GetOccurrencesQuery({
          eventId,
          startDate: new Date("2025-03-01"),
          endDate: new Date("2025-06-30"),
          first: 20,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("May occurrence");
  });

  it("should paginate occurrences with cursor", async () => {
    const eventId = randomUUID();
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const sorted = [...ids].sort();

    await occurrenceCollection.create(
      sorted.map((id, i) => ({
        _id: id,
        eventId,
        organizationId: tenantId,
        startDate: new Date(`2025-0${i + 1}-10T10:00:00`),
        endDate: new Date(`2025-0${i + 1}-10T12:00:00`),
        title: `Occurrence ${i + 1}`,
        location: null,
        maxCapacity: 10,
        registeredSeats: 0,
        deletedAt: null,
      })),
    );

    // First page
    const firstPage = await cls.run(async () => {
      cls.set("tenantId", tenantId);
      cls.set("tenantSlug", tenantSlug);
      return queryHandler.execute(
        new GetOccurrencesQuery({ eventId, first: 2, correlationId: randomUUID() }),
      );
    });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasNextPage).toBe(true);
    expect(firstPage.totalCount).toBe(5);

    // Second page using cursor
    const lastItemId = firstPage.items[firstPage.items.length - 1]?.id ?? "";
    const cursor = encodeCursor(lastItemId);

    const secondPage = await cls.run(async () => {
      cls.set("tenantId", tenantId);
      cls.set("tenantSlug", tenantSlug);
      return queryHandler.execute(
        new GetOccurrencesQuery({ eventId, first: 2, after: cursor, correlationId: randomUUID() }),
      );
    });

    expect(secondPage.items).toHaveLength(2);
    const firstPageIds = firstPage.items.map((o) => o.id);
    const secondPageIds = secondPage.items.map((o) => o.id);
    expect(secondPageIds).not.toEqual(firstPageIds);
  });
});

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
import type { EventDocument } from "../../../infrastructure/event/event.schema";
import { EventSchema } from "../../../infrastructure/event/event.schema";
import { GetEventsHandler, GetEventsQuery } from "./get-events.query";

const mongoUri = process.env.MONGODB_URI;
if (!mongoUri) throw new Error("MONGODB_URI not set — did testcontainers globalSetup run?");

// Stub CacheService that always misses (forces DB queries)
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

describe("GetEventsHandler (integration)", () => {
  let queryHandler: GetEventsHandler;
  let cls: ClsService;
  let module: TestingModule;
  let connection: Connection;
  let tenantSlug: string;
  let tenantId: string;
  let eventCollection: Model<EventDocument>;

  beforeAll(async () => {
    tenantSlug = generateTestTenantSlug();
    tenantId = generateTestTenantId();

    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(mongoUri, { serverSelectionTimeoutMS: 5000 }),
        TestLoggerModule,
        CqrsModule,
        ClsModule.forRoot({ global: true }),
      ],
      providers: [
        GetEventsHandler,
        TenantConnectionRegistry,
        { provide: CacheService, useClass: StubCacheService },
      ],
    }).compile();

    connection = module.get<Connection>(getConnectionToken());
    cls = module.get(ClsService);
    queryHandler = module.get(GetEventsHandler);

    await module.init();

    // Get the tenant-scoped collection model for seeding
    const registry = module.get(TenantConnectionRegistry);
    eventCollection = registry.getModel<EventDocument>(tenantSlug, "events", EventSchema);
  });

  beforeEach(async () => {
    if (connection) {
      await truncateCollections(connection, [`${tenantSlug}_events`]);
    }
  });

  afterAll(async () => {
    if (connection) {
      await truncateCollections(connection, [`${tenantSlug}_events`]);
    }
    if (module) {
      await module.close();
    }
  });

  it("should return events for tenant", async () => {
    const eventId1 = randomUUID();
    const eventId2 = randomUUID();
    const eventId3 = randomUUID();

    await eventCollection.create([
      {
        _id: eventId1,
        organizationId: tenantId,
        title: "Event 1",
        description: "Description 1",
        location: null,
        startDate: new Date("2025-03-01"),
        endDate: new Date("2025-03-01T02:00:00"),
        maxCapacity: 10,
        recurrencePattern: null,
        deletedAt: null,
      },
      {
        _id: eventId2,
        organizationId: tenantId,
        title: "Event 2",
        description: "Description 2",
        location: null,
        startDate: new Date("2025-03-02"),
        endDate: new Date("2025-03-02T02:00:00"),
        maxCapacity: 20,
        recurrencePattern: null,
        deletedAt: null,
      },
      {
        _id: eventId3,
        organizationId: tenantId,
        title: "Event 3",
        description: "Description 3",
        location: null,
        startDate: new Date("2025-03-03"),
        endDate: new Date("2025-03-03T02:00:00"),
        maxCapacity: 30,
        recurrencePattern: null,
        deletedAt: null,
      },
    ]);

    const result = await cls.run(async () => {
      cls.set("tenantId", tenantId);
      cls.set("tenantSlug", tenantSlug);
      return queryHandler.execute(new GetEventsQuery({ first: 20, correlationId: randomUUID() }));
    });

    expect(result.items).toHaveLength(3);
    expect(result.totalCount).toBe(3);
    expect(result.hasNextPage).toBe(false);
  });

  it("should filter by date range", async () => {
    const eventId1 = randomUUID();
    const eventId2 = randomUUID();
    const eventId3 = randomUUID();

    await eventCollection.create([
      {
        _id: eventId1,
        organizationId: tenantId,
        title: "January Event",
        description: "In January",
        location: null,
        startDate: new Date("2025-01-15"),
        endDate: new Date("2025-01-15T02:00:00"),
        maxCapacity: 10,
        recurrencePattern: null,
        deletedAt: null,
      },
      {
        _id: eventId2,
        organizationId: tenantId,
        title: "March Event",
        description: "In March",
        location: null,
        startDate: new Date("2025-03-15"),
        endDate: new Date("2025-03-15T02:00:00"),
        maxCapacity: 20,
        recurrencePattern: null,
        deletedAt: null,
      },
      {
        _id: eventId3,
        organizationId: tenantId,
        title: "December Event",
        description: "In December",
        location: null,
        startDate: new Date("2025-12-15"),
        endDate: new Date("2025-12-15T02:00:00"),
        maxCapacity: 30,
        recurrencePattern: null,
        deletedAt: null,
      },
    ]);

    const result = await cls.run(async () => {
      cls.set("tenantId", tenantId);
      cls.set("tenantSlug", tenantSlug);
      return queryHandler.execute(
        new GetEventsQuery({
          startDate: new Date("2025-02-01"),
          endDate: new Date("2025-11-30"),
          first: 20,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.title).toBe("March Event");
  });

  it("should paginate with cursor", async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const sorted = [...ids].sort(); // MongoDB sorts _id (strings) lexicographically

    await eventCollection.create(
      sorted.map((id, i) => ({
        _id: id,
        organizationId: tenantId,
        title: `Event ${i + 1}`,
        description: `Desc ${i + 1}`,
        location: null,
        startDate: new Date(`2025-0${i + 1}-01`),
        endDate: new Date(`2025-0${i + 1}-01T02:00:00`),
        maxCapacity: 10,
        recurrencePattern: null,
        deletedAt: null,
      })),
    );

    // First page
    const firstPage = await cls.run(async () => {
      cls.set("tenantId", tenantId);
      cls.set("tenantSlug", tenantSlug);
      return queryHandler.execute(new GetEventsQuery({ first: 2, correlationId: randomUUID() }));
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
        new GetEventsQuery({ first: 2, after: cursor, correlationId: randomUUID() }),
      );
    });

    expect(secondPage.items).toHaveLength(2);
    // The second page items should be different from first page
    const firstPageIds = firstPage.items.map((e) => e.id);
    const secondPageIds = secondPage.items.map((e) => e.id);
    expect(secondPageIds).not.toEqual(firstPageIds);
  });
});

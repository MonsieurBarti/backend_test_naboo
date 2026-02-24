import { randomUUID } from "node:crypto";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Model } from "mongoose";
import { ClsModule, ClsService } from "nestjs-cls";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { encodeCursor } from "../../../../../shared/graphql/relay-pagination";
import { CacheService } from "../../../../../shared/redis/cache.service";
import { TestLoggerModule } from "../../../../../shared/testing/test-logger.module";
import { MongooseRegistrationRepository } from "../../../infrastructure/registration/mongoose-registration.repository";
import type { RegistrationDocument } from "../../../infrastructure/registration/registration.schema";
import { RegistrationSchema } from "../../../infrastructure/registration/registration.schema";
import { REGISTRATION_REPOSITORY } from "../../../registration.tokens";
import { GetRegistrationsHandler, GetRegistrationsQuery } from "./get-registrations.query";

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

describe("GetRegistrationsHandler (integration)", () => {
  let queryHandler: GetRegistrationsHandler;
  let cls: ClsService;
  let module: TestingModule;
  let registrationModel: Model<RegistrationDocument>;

  const orgId = randomUUID();
  const userId1 = randomUUID();
  const userId2 = randomUUID();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(MONGODB_URI, { serverSelectionTimeoutMS: 5000 }),
        MongooseModule.forFeature([{ name: "Registration", schema: RegistrationSchema }]),
        TestLoggerModule,
        CqrsModule,
        ClsModule.forRoot({ global: true }),
      ],
      providers: [
        GetRegistrationsHandler,
        { provide: REGISTRATION_REPOSITORY, useClass: MongooseRegistrationRepository },
        { provide: CacheService, useClass: StubCacheService },
      ],
    }).compile();

    registrationModel = module.get<Model<RegistrationDocument>>(getModelToken("Registration"));
    cls = module.get(ClsService);
    queryHandler = module.get(GetRegistrationsHandler);

    await module.init();
  });

  beforeEach(async () => {
    await registrationModel.deleteMany({ organizationId: orgId });
  });

  afterAll(async () => {
    if (registrationModel) {
      await registrationModel.deleteMany({ organizationId: orgId });
    }
    if (module) {
      await module.close();
    }
  });

  const makeRegistration = (
    id: string,
    userId: string,
    status: "active" | "cancelled" = "active",
    occurrenceIndex = 0,
  ) => ({
    _id: id,
    occurrenceId: randomUUID(),
    organizationId: orgId,
    userId,
    seatCount: 1,
    status,
    occurrenceStartDate: new Date(`2025-0${occurrenceIndex + 1}-10T10:00:00`),
    occurrenceEndDate: new Date(`2025-0${occurrenceIndex + 1}-10T12:00:00`),
    eventTitle: `Event ${occurrenceIndex + 1}`,
    deletedAt: null,
  });

  it("should return registrations for a user in an organization", async () => {
    const reg1Id = randomUUID();
    const reg2Id = randomUUID();
    const reg3Id = randomUUID();

    await registrationModel.create([
      makeRegistration(reg1Id, userId1, "active", 0),
      makeRegistration(reg2Id, userId1, "active", 1),
      makeRegistration(reg3Id, userId2, "active", 2),
    ]);

    const result = await cls.run(async () => {
      cls.set("tenantId", orgId);
      return queryHandler.execute(
        new GetRegistrationsQuery({
          userId: userId1,
          organizationId: orgId,
          first: 20,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    for (const item of result.items) {
      expect(item.userId).toBe(userId1);
    }
  });

  it("should exclude cancelled registrations by default", async () => {
    const reg1Id = randomUUID();
    const reg2Id = randomUUID();

    await registrationModel.create([
      makeRegistration(reg1Id, userId1, "active", 0),
      makeRegistration(reg2Id, userId1, "cancelled", 1),
    ]);

    const result = await cls.run(async () => {
      cls.set("tenantId", orgId);
      return queryHandler.execute(
        new GetRegistrationsQuery({
          userId: userId1,
          organizationId: orgId,
          includeCancelled: false,
          first: 20,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.status).toBe("active");
  });

  it("should include cancelled registrations when includeCancelled=true", async () => {
    const reg1Id = randomUUID();
    const reg2Id = randomUUID();

    await registrationModel.create([
      makeRegistration(reg1Id, userId1, "active", 0),
      makeRegistration(reg2Id, userId1, "cancelled", 1),
    ]);

    const result = await cls.run(async () => {
      cls.set("tenantId", orgId);
      return queryHandler.execute(
        new GetRegistrationsQuery({
          userId: userId1,
          organizationId: orgId,
          includeCancelled: true,
          first: 20,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(result.items).toHaveLength(2);
    expect(result.totalCount).toBe(2);
    const statuses = result.items.map((i) => i.status);
    expect(statuses).toContain("active");
    expect(statuses).toContain("cancelled");
  });

  it("should paginate registrations with cursor", async () => {
    const ids = [randomUUID(), randomUUID(), randomUUID(), randomUUID(), randomUUID()];
    const sorted = [...ids].sort();

    await registrationModel.create(
      sorted.map((id, i) => makeRegistration(id, userId1, "active", i)),
    );

    // First page
    const firstPage = await cls.run(async () => {
      cls.set("tenantId", orgId);
      return queryHandler.execute(
        new GetRegistrationsQuery({
          userId: userId1,
          organizationId: orgId,
          first: 2,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(firstPage.items).toHaveLength(2);
    expect(firstPage.hasNextPage).toBe(true);
    expect(firstPage.totalCount).toBe(5);

    // Second page
    const lastItemId = firstPage.items[firstPage.items.length - 1]?.id ?? "";
    const cursor = encodeCursor(lastItemId);

    const secondPage = await cls.run(async () => {
      cls.set("tenantId", orgId);
      return queryHandler.execute(
        new GetRegistrationsQuery({
          userId: userId1,
          organizationId: orgId,
          first: 2,
          after: cursor,
          correlationId: randomUUID(),
        }),
      );
    });

    expect(secondPage.items).toHaveLength(2);
    const firstPageIds = firstPage.items.map((r) => r.id);
    const secondPageIds = secondPage.items.map((r) => r.id);
    expect(secondPageIds).not.toEqual(firstPageIds);
  });
});

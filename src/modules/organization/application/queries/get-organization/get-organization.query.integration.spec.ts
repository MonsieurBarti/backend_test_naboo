import { randomUUID } from "node:crypto";
import { ConfigModule } from "@nestjs/config";
import { CqrsModule } from "@nestjs/cqrs";
import { getModelToken, MongooseModule } from "@nestjs/mongoose";
import { Test, type TestingModule } from "@nestjs/testing";
import type { Model } from "mongoose";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TestLoggerModule } from "../../../../../shared/testing/test-logger.module";
import { MongooseOrganizationRepository } from "../../../infrastructure/organization/mongoose-organization.repository";
import { OrganizationMapper } from "../../../infrastructure/organization/organization.mapper";
import type { OrganizationDocument } from "../../../infrastructure/organization/organization.schema";
import { OrganizationSchema } from "../../../infrastructure/organization/organization.schema";
import { ORGANIZATION_REPOSITORY } from "../../../organization.tokens";
import type { GetOrganizationQueryResult } from "./get-organization.query";
import { GetOrganizationHandler, GetOrganizationQuery } from "./get-organization.query";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/test?replicaSet=rs0";

describe("GetOrganizationHandler (integration)", () => {
  let orgModel: Model<OrganizationDocument>;
  let queryHandler: GetOrganizationHandler;
  let module: TestingModule;

  const org1Id = randomUUID();
  const org2Id = randomUUID();

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({ isGlobal: true }),
        MongooseModule.forRoot(MONGODB_URI),
        MongooseModule.forFeature([{ name: "Organization", schema: OrganizationSchema }]),
        TestLoggerModule,
        CqrsModule,
      ],
      providers: [
        GetOrganizationHandler,
        OrganizationMapper,
        { provide: ORGANIZATION_REPOSITORY, useClass: MongooseOrganizationRepository },
      ],
    }).compile();

    orgModel = module.get<Model<OrganizationDocument>>(getModelToken("Organization"));
    queryHandler = module.get(GetOrganizationHandler);

    await module.init();

    // Cleanup any leftovers from previous runs
    await orgModel.deleteMany({ _id: { $in: [org1Id, org2Id] } });

    // Seed test data
    await orgModel.create([
      { _id: org1Id, name: "Acme Corp", slug: "acme-corp", createdAt: new Date("2024-01-01") },
      { _id: org2Id, name: "Beta Inc", slug: "beta-inc", createdAt: new Date("2024-02-01") },
    ]);
  });

  afterAll(async () => {
    await orgModel.deleteMany({ _id: { $in: [org1Id, org2Id] } });
    await module.close();
  });

  it("should return organization by ID", async () => {
    const result: GetOrganizationQueryResult = await queryHandler.execute(
      new GetOrganizationQuery({ id: org1Id, correlationId: randomUUID() }),
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe(org1Id);
    expect(result?.name).toBe("Acme Corp");
    expect(result?.slug).toBe("acme-corp");
  });

  it("should return organization by slug", async () => {
    const result: GetOrganizationQueryResult = await queryHandler.execute(
      new GetOrganizationQuery({ slug: "beta-inc", correlationId: randomUUID() }),
    );

    expect(result).not.toBeNull();
    expect(result?.id).toBe(org2Id);
    expect(result?.name).toBe("Beta Inc");
    expect(result?.slug).toBe("beta-inc");
  });

  it("should return null for non-existent ID", async () => {
    const result: GetOrganizationQueryResult = await queryHandler.execute(
      new GetOrganizationQuery({ id: randomUUID(), correlationId: randomUUID() }),
    );

    expect(result).toBeNull();
  });
});

import { getConnectionToken } from "@nestjs/mongoose";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Test } from "@nestjs/testing";
import type Redis from "ioredis";
import type { Connection } from "mongoose";
import { AppModule } from "../../app.module";
import { ZodValidationPipe } from "../pipes/zod-validation.pipe";
import { REDIS_CLIENT } from "../redis/redis.tokens";

export interface TestApp {
  app: NestFastifyApplication;
  mongoConnection: Connection;
  redisClient: Redis;
}

export interface GqlResponse {
  data: Record<string, unknown>;
  errors?: { message: string }[];
}

/**
 * Bootstraps the full NestJS app with Fastify adapter for e2e tests.
 *
 * Usage:
 *   const { app, mongoConnection, redisClient } = await createTestApp();
 *   // ... run tests ...
 *   await app.close();
 */
export async function createTestApp(): Promise<TestApp> {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ logger: false }),
  );

  app.useGlobalPipes(new ZodValidationPipe());

  await app.init();
  await app.getHttpAdapter().getInstance().ready();

  const mongoConnection = app.get<Connection>(getConnectionToken());
  const redisClient = app.get<Redis>(REDIS_CLIENT);

  return { app, mongoConnection, redisClient };
}

/**
 * Sends a GraphQL request to the test app via Fastify inject.
 */
export async function gqlRequest(
  app: NestFastifyApplication,
  query: string,
  variables: Record<string, unknown> = {},
  headers: Record<string, string> = {},
): Promise<GqlResponse> {
  const response = await app.inject({
    method: "POST",
    url: "/graphql",
    payload: { query, variables },
    headers: {
      "content-type": "application/json",
      ...headers,
    },
  });

  // JSON.parse returns `any` — assign directly to typed variable for runtime narrowing
  const parsed: { data: Record<string, unknown>; errors?: { message: string }[] } = JSON.parse(
    response.body,
  );
  return parsed;
}

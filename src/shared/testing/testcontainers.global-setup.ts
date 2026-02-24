import { unlinkSync, writeFileSync } from "node:fs";
import { MongoDBContainer } from "@testcontainers/mongodb";
import { RedisContainer } from "@testcontainers/redis";

const TEMP_FILE = "/tmp/testcontainers-uris.json";

export async function setup(): Promise<() => Promise<void>> {
  const [mongo, redis] = await Promise.all([
    new MongoDBContainer("mongo:7").start(),
    new RedisContainer("redis:7-alpine").start(),
  ]);

  const mongoUri = `${mongo.getConnectionString()}?directConnection=true`;
  const redisUrl = `redis://${redis.getHost()}:${redis.getMappedPort(6379)}`;

  writeFileSync(TEMP_FILE, JSON.stringify({ mongoUri, redisUrl }));

  return async () => {
    await Promise.all([mongo.stop(), redis.stop()]);
    try {
      unlinkSync(TEMP_FILE);
    } catch {
      // ignore if already deleted
    }
  };
}

export default setup;

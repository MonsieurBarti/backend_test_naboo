import { readFileSync } from "node:fs";

const TEMP_FILE = "/tmp/testcontainers-uris.json";

try {
  const raw = readFileSync(TEMP_FILE, "utf-8");
  const uris: { mongoUri: string; redisUrl: string } = JSON.parse(raw);
  process.env.MONGODB_URI = uris.mongoUri;
  process.env.REDIS_URL = uris.redisUrl;
} catch {
  // File doesn't exist — unit tests don't need containers
}

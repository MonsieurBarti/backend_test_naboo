import { Inject, Injectable } from "@nestjs/common";
import Redis from "ioredis";
import { InjectLogger } from "../logger/inject-logger.decorator";
import { BaseLogger } from "../logger/logger";
import { REDIS_CLIENT } from "./redis.tokens";

@Injectable()
export class CacheService {
  private readonly logger: BaseLogger;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "redis",
      className: CacheService.name,
    });
  }

  async get<T>(key: string): Promise<T | null> {
    const raw = await this.redis.get(key);
    if (raw === null) {
      this.logger.debug("cache miss", { data: { key } });
      return null;
    }
    this.logger.debug("cache hit", { data: { key } });
    return JSON.parse(raw) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    await this.redis.set(key, JSON.stringify(value), "EX", ttlSeconds);
    this.logger.debug("cache set", { data: { key, ttlSeconds } });
  }

  async del(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug("cache del", { data: { key } });
  }

  async delPattern(pattern: string): Promise<void> {
    const keys: string[] = [];
    const stream = this.redis.scanStream({ match: pattern, count: 100 });
    await new Promise<void>((resolve, reject) => {
      stream.on("data", (batch: string[]) => {
        for (const key of batch) {
          keys.push(key);
        }
      });
      stream.on("end", resolve);
      stream.on("error", reject);
    });
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
    this.logger.debug("cache delPattern", { data: { pattern, count: keys.length } });
  }
}

import { Inject, Injectable, OnApplicationBootstrap } from "@nestjs/common";
import Redis from "ioredis";
import { InjectLogger } from "../logger/inject-logger.decorator";
import { BaseLogger } from "../logger/logger";
import { REDIS_CLIENT } from "./redis.tokens";

@Injectable()
export class RedisService implements OnApplicationBootstrap {
  private readonly logger: BaseLogger;

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "redis",
      className: RedisService.name,
    });
  }

  async onApplicationBootstrap(): Promise<void> {
    try {
      await this.redis.ping();
      this.logger.log("Redis connection verified");
    } catch (error) {
      this.logger.error("Redis connection failed", error);
    }
  }

  async isHealthy(): Promise<boolean> {
    try {
      const result = await this.redis.ping();
      return result === "PONG";
    } catch {
      return false;
    }
  }
}

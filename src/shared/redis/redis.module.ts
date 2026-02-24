import { Global, Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import Redis from "ioredis";
import { CacheService } from "./cache.service";
import { RedisService } from "./redis.service";
import { REDIS_CLIENT } from "./redis.tokens";

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const url = config.get<string>("REDIS_URL") ?? "redis://localhost:6379";
        return new Redis(url);
      },
      inject: [ConfigService],
    },
    RedisService,
    CacheService,
  ],
  exports: [REDIS_CLIENT, RedisService, CacheService],
})
export class RedisModule {}

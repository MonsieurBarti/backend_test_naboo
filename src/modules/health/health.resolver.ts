import { Field, ObjectType, Query, Resolver } from "@nestjs/graphql";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection } from "mongoose";
import { Public } from "../../shared/guards/tenant.guard";
import { RedisService } from "../../shared/redis/redis.service";

@ObjectType()
export class HealthStatus {
  @Field()
  status!: string;

  @Field()
  mongodb!: boolean;

  @Field()
  redis!: boolean;
}

@Resolver()
export class HealthResolver {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redisService: RedisService,
  ) {}

  @Public()
  @Query(() => HealthStatus)
  async health(): Promise<HealthStatus> {
    const mongodb = this.connection.readyState === 1;
    const redis = await this.redisService.isHealthy();
    return {
      status: mongodb && redis ? "ok" : "degraded",
      mongodb,
      redis,
    };
  }
}

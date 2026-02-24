import { randomUUID } from "node:crypto";
import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { CqrsModule } from "@nestjs/cqrs";
import type { FastifyRequest } from "fastify";
import { ClsModule } from "nestjs-cls";
import { validateEnvironment } from "./config/env";
import { EventModule } from "./modules/event/event.module";
import { HealthModule } from "./modules/health/health.module";
import { OrganizationModule } from "./modules/organization/organization.module";
import { RegistrationModule } from "./modules/registration/registration.module";
import { CqrsProviderModule } from "./shared/cqrs/cqrs-provider.module";
import { DateProviderModule } from "./shared/date/date-provider.module";
import { GraphqlConfigModule } from "./shared/graphql/graphql.module";
import { TenantGuard } from "./shared/guards/tenant.guard";
import { CqrsInterceptor } from "./shared/interceptors/cqrs.interceptor";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";
import { AppLoggerModule } from "./shared/logger/app-logger.module";
import { MongooseConfigModule } from "./shared/mongoose/mongoose.module";
import { RedisModule } from "./shared/redis/redis.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    AppLoggerModule,
    MongooseConfigModule,
    RedisModule,
    GraphqlConfigModule,
    DateProviderModule,
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: FastifyRequest) =>
          (req.headers["x-correlation-id"] as string | undefined) ?? randomUUID(),
      },
    }),
    CqrsModule.forRoot(),
    CqrsProviderModule,
    HealthModule,
    OrganizationModule,
    EventModule,
    RegistrationModule,
  ],
  providers: [
    CqrsInterceptor,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_GUARD, useClass: TenantGuard },
  ],
})
export class AppModule {}

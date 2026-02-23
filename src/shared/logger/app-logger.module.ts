import { Global, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { ClsService } from "nestjs-cls";
import { LoggerModule, PinoLogger } from "nestjs-pino";
import type { EnvVars } from "../../config/env";
import { LOGGER_TOKEN } from "./inject-logger.decorator";
import { getLoggerConfig } from "./logger.config";
import { AppLogger } from "./pino-logger";

@Global()
@Module({
  imports: [
    LoggerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvVars, true>) => getLoggerConfig(configService),
    }),
  ],
  providers: [
    {
      provide: LOGGER_TOKEN,
      useFactory: (
        pinoLogger: PinoLogger,
        configService: ConfigService<EnvVars, true>,
        cls?: ClsService,
      ) => new AppLogger(pinoLogger, cls, configService.get("IS_LOCAL", { infer: true })),
      // ClsService is marked optional so that test environments without ClsModule
      // still work. When ClsModule is registered globally (app.module.ts, Plan 03),
      // ClsService is available and correlationId enrichment activates automatically.
      inject: [PinoLogger, ConfigService, { token: ClsService, optional: true }],
    },
  ],
  exports: [LOGGER_TOKEN],
})
export class AppLoggerModule {}

import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_INTERCEPTOR } from "@nestjs/core";
import { validateEnvironment } from "./config/env";
import { IDateProvider } from "./shared/date/date-provider";
import { DateProvider } from "./shared/date/date-provider.impl";
import { CqrsInterceptor } from "./shared/interceptors/cqrs.interceptor";
import { LoggingInterceptor } from "./shared/interceptors/logging.interceptor";
import { AppLoggerModule } from "./shared/logger/app-logger.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, cache: true, validate: validateEnvironment }),
    AppLoggerModule,
  ],
  providers: [
    CqrsInterceptor,
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: IDateProvider, useClass: DateProvider },
  ],
})
export class AppModule {}

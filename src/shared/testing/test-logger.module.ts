import { Global, Module } from "@nestjs/common";
import { LOGGER_TOKEN } from "../logger/inject-logger.decorator";
import { InMemoryLogger } from "../logger/in-memory-logger";

@Global()
@Module({
  providers: [{ provide: LOGGER_TOKEN, useValue: new InMemoryLogger() }],
  exports: [LOGGER_TOKEN],
})
export class TestLoggerModule {}

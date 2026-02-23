import { NestFactory } from "@nestjs/core";
import { FastifyAdapter, type NestFastifyApplication } from "@nestjs/platform-fastify";
import { Logger } from "nestjs-pino";
import { AppModule } from "./app.module";
import { ZodValidationPipe } from "./shared/pipes/zod-validation.pipe";
import "./config/env"; // validates env at startup — process.exit(1) if vars are missing

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));
  app.useGlobalPipes(new ZodValidationPipe());
  app.enableShutdownHooks();

  const port = process.env.PORT ?? 3000;
  await app.listen(port, "0.0.0.0");
}

bootstrap();

import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { FastifyRequest } from "fastify";
import { randomUUID } from "node:crypto";

export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest<FastifyRequest>();
    const raw = request.raw as typeof request.raw & { correlationId?: string };
    return (
      raw.correlationId ??
      (request.headers["x-correlation-id"] as string) ??
      randomUUID()
    );
  },
);

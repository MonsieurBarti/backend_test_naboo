import { randomUUID } from "node:crypto";
import { ArgumentsHost } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import { FastifyReply, FastifyRequest } from "fastify";
import { InjectLogger } from "../logger/inject-logger.decorator";
import { BaseLogger } from "../logger/logger";
import { BaseDomainError } from "./base-domain.error";

export class ErrorResponseDto {
  type!: string;

  title!: string;

  status!: number;

  detail!: string;

  instance!: string;

  correlationId!: string;

  timestamp!: string;

  metadata?: Record<string, unknown>;
}

export abstract class BaseFeatureExceptionFilter<
  TError extends BaseDomainError,
> extends BaseExceptionFilter {
  protected readonly logger: BaseLogger;

  constructor(@InjectLogger() logger: BaseLogger) {
    super();
    this.logger = logger.createChild({
      moduleName: "exception-filter",
      className: this.constructor.name,
    });
  }

  override async catch(error: TError, host: ArgumentsHost): Promise<void> {
    const ctx = host.switchToHttp();
    const request = ctx.getRequest<FastifyRequest>();
    const response = ctx.getResponse<FastifyReply>();

    const correlationId = error.correlationId ?? this.extractCorrelationId(request);

    this.logger.error(`${error.errorCode} | ${error.message}`, error, {
      correlationId,
      data: error.metadata,
    });

    const statusCode = this.mapErrorToStatus(error);

    await response
      .status(statusCode)
      .send(this.buildErrorResponse(error, request, statusCode, correlationId));
  }

  /**
   * Maps a domain error to an HTTP status code.
   * Check system errors (5xx) FIRST, then user errors (4xx).
   * Fall through to INTERNAL_SERVER_ERROR as a safety net — it signals a missing mapping.
   *
   * @example
   * protected mapErrorToStatus(error: OrderError): number {
   *   if (error instanceof OrderNotFoundError) return HttpStatus.NOT_FOUND;
   *   if (error instanceof OrderAlreadyCancelledError) return HttpStatus.CONFLICT;
   *   return HttpStatus.INTERNAL_SERVER_ERROR; // missing mapping — fix it
   * }
   */
  protected abstract mapErrorToStatus(error: TError): number;

  private buildErrorResponse(
    error: TError,
    request: FastifyRequest,
    statusCode: number,
    correlationId: string,
  ): ErrorResponseDto {
    return {
      type: error.errorCode,
      title: error.name,
      status: statusCode,
      detail: error.message,
      instance: request.url,
      correlationId,
      timestamp: new Date().toISOString(),
      metadata: error.metadata,
    };
  }

  private extractCorrelationId(request: FastifyRequest): string {
    const raw = request.raw as typeof request.raw & { correlationId?: string };
    return raw.correlationId ?? (request.headers["correlationid"] as string) ?? randomUUID();
  }
}

import { Injectable, Optional } from "@nestjs/common";
import { ClsService } from "nestjs-cls";
import { PinoLogger } from "nestjs-pino";
import { buildLocalPayload, shouldLog } from "./local-log-formatter";
import { BaseLogger, ChildLoggerContext, LogParams } from "./logger";

@Injectable()
export class AppLogger extends BaseLogger {
  private readonly context: ChildLoggerContext;
  private readonly isLocal: boolean;

  constructor(
    private readonly pinoLogger: PinoLogger,
    @Optional() private readonly cls?: ClsService,
    isLocal: boolean = false,
    context: ChildLoggerContext = {},
  ) {
    super();
    this.isLocal = isLocal;
    this.context = context;
  }

  /**
   * Reads correlationId from the CLS store (set per-request by ClsMiddleware)
   * and merges it into the log params. If correlationId is already present in
   * params, it is not overridden. Returns a new params object; never mutates input.
   */
  private enrichWithCorrelationId(params?: LogParams): LogParams | undefined {
    const correlationId = this.cls?.getId();
    if (!correlationId) return params;
    if (params?.correlationId) return params;
    return { ...params, correlationId };
  }

  log(message: string, params?: LogParams): void {
    if (!shouldLog(this.context, this.isLocal)) return;
    const enriched = this.enrichWithCorrelationId(params);
    if (this.isLocal) {
      this.pinoLogger.info(buildLocalPayload(message, this.context, enriched));
    } else {
      this.pinoLogger.info({ ...this.context, ...enriched }, message);
    }
  }

  warn(message: string, params?: LogParams): void {
    if (!shouldLog(this.context, this.isLocal)) return;
    const enriched = this.enrichWithCorrelationId(params);
    if (this.isLocal) {
      this.pinoLogger.warn(buildLocalPayload(message, this.context, enriched));
    } else {
      this.pinoLogger.warn({ ...this.context, ...enriched }, message);
    }
  }

  debug(message: string, params?: LogParams): void {
    if (!shouldLog(this.context, this.isLocal)) return;
    const enriched = this.enrichWithCorrelationId(params);
    if (this.isLocal) {
      this.pinoLogger.debug(buildLocalPayload(message, this.context, enriched));
    } else {
      this.pinoLogger.debug({ ...this.context, ...enriched }, message);
    }
  }

  error(message: string, error: unknown, params?: LogParams): void {
    if (!shouldLog(this.context, this.isLocal)) return;
    const enriched = this.enrichWithCorrelationId(params);
    if (this.isLocal) {
      this.pinoLogger.error(buildLocalPayload(message, this.context, enriched, error));
    } else {
      this.pinoLogger.error({ ...this.context, ...enriched, err: error }, message);
    }
  }

  createChild(context: ChildLoggerContext): BaseLogger {
    return new AppLogger(this.pinoLogger, this.cls, this.isLocal, {
      ...this.context,
      ...context,
    });
  }
}

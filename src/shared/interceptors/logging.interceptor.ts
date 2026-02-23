import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { GqlExecutionContext } from "@nestjs/graphql";
import type { FastifyRequest } from "fastify";
import type { Observable } from "rxjs";
import type { EnvVars } from "../../config/env";
import { InjectLogger } from "../logger/inject-logger.decorator";
import { BaseLogger } from "../logger/logger";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger: BaseLogger;

  constructor(
    @InjectLogger() logger: BaseLogger,
    private readonly configService: ConfigService<EnvVars, true>,
  ) {
    this.logger = logger.createChild({
      moduleName: "http",
      className: LoggingInterceptor.name,
    });
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = this.getRequest(context);
    if (!request) {
      return next.handle();
    }

    const { method, url, body, query, params } = request;
    const userAgent = request.headers["user-agent"] ?? "";
    const isLocal = this.configService.get("IS_LOCAL", { infer: true });

    if (body && !isLocal) {
      this.logger.log(`${method} ${url} received`, {
        data: { body, query, params, userAgent },
      });
    }

    return next.handle();
  }

  private getRequest(context: ExecutionContext): FastifyRequest | null {
    const type = context.getType<string>();
    if (type === "graphql") {
      const gqlCtx = GqlExecutionContext.create(context);
      return gqlCtx.getContext<{ req: FastifyRequest }>().req ?? null;
    }
    return context.switchToHttp().getRequest<FastifyRequest>() ?? null;
  }
}

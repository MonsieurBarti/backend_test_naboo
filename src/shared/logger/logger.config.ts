import pino from "pino";
import type { Params } from "nestjs-pino";
import type { ConfigService } from "@nestjs/config";
import type { EnvVars } from "../../config/env";
import { requestSerializer } from "./request-serializer";

const responseSerializer = pino.stdSerializers.res;

export const getLoggerConfig = (configService: ConfigService<EnvVars, true>): Params => {
  const isLocal = configService.get("IS_LOCAL", { infer: true });

  return {
    pinoHttp: {
      serializers: {
        err: pino.stdSerializers.err,
        req: requestSerializer,   // ← replaces pino.stdSerializers.req
        res: responseSerializer,
      },
      autoLogging: false,
      wrapSerializers: true,
      level: isLocal ? "debug" : "info",
      transport: isLocal
        ? {
            target: "pino-pretty",
            options: {
              colorize: true,
              colorizeObjects: false,
              singleLine: true,
              translateTime: "SYS:HH:MM:ss",
              messageFormat: "{msg}",
            },
          }
        : undefined,
      customLogLevel: (_req, res, err) => {
        if (isLocal) return "silent";
        if (res.statusCode >= 400 && res.statusCode < 500) return "warn";
        else if (res.statusCode >= 500 || err) return "error";
        else if (res.statusCode >= 300 && res.statusCode < 400) return "silent";
        return "info";
      },
      customSuccessMessage: (req, res) => {
        if (res.statusCode === 404) return "resource not found";
        return `${req.method} completed`;
      },
      customReceivedMessage: (_req, _res) => "request received",
      customErrorMessage: (_req, _res, _err) =>
        `request errored with status code: ${_res.statusCode}`,
      customAttributeKeys: {
        req: "request",
        res: "response",
        err: "error",
        responseTime: "timeTaken",
      },
    },
  };
};

import { LocalLoggerConfig } from "./local-logger.config";

interface SerializedRequest {
  method: string;
  url: string;
  headers?: Record<string, unknown>;
  body?: unknown;
  query?: Record<string, unknown>;
  params?: Record<string, unknown>;
  remoteAddress?: string;
  userAgent?: string;
}

export const requestSerializer = (req: Record<string, unknown>): SerializedRequest => {
  const isLocal = process.env["IS_LOCAL"] === "true";

  if (isLocal && !LocalLoggerConfig.showFullRequest) {
    return {
      method: req["method"] as string,
      url: req["url"] as string,
    };
  }

  const headers = req["headers"] as Record<string, unknown> | undefined;

  return {
    method: req["method"] as string,
    url: req["url"] as string,
    headers,
    body: req["body"],
    query: req["query"] as Record<string, unknown> | undefined,
    params: req["params"] as Record<string, unknown> | undefined,
    remoteAddress: (req["ip"] ?? req["remoteAddress"]) as string | undefined,
    userAgent: headers?.["user-agent"] as string | undefined,
  };
};

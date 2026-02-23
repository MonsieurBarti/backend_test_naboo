import type { ChildLoggerContext, LogParams } from "./logger";
import { LocalLoggerConfig } from "./local-logger.config";

const ANSI: Record<string, string> = {
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  gray: "\x1b[90m",
  reset: "\x1b[0m",
};

function colorize(text: string, color: string): string {
  return `${ANSI[color] ?? ANSI["white"]}${text}${ANSI["reset"]}`;
}

export function shouldLog(context: ChildLoggerContext, isLocal: boolean): boolean {
  if (!isLocal) return true;
  const mod = context.moduleName;
  if (!mod) return true;
  if (LocalLoggerConfig.enabledModules.length > 0) {
    return LocalLoggerConfig.enabledModules.includes(mod);
  }
  if (LocalLoggerConfig.disabledModules.length > 0) {
    return !LocalLoggerConfig.disabledModules.includes(mod);
  }
  return true;
}

export function buildLocalPayload(
  message: string,
  context: ChildLoggerContext,
  params?: LogParams,
  error?: unknown,
): Record<string, unknown> {
  const parts: string[] = [];

  if (context.moduleName) {
    const color = LocalLoggerConfig.moduleColors[context.moduleName] ?? "white";
    parts.push(colorize(`[${context.moduleName}]`, color));
  }
  if (context.className) {
    parts.push(colorize(context.className, "gray"));
  }

  const prefix = parts.length > 0 ? `${parts.join(" ")} | ` : "";
  const payload: Record<string, unknown> = { msg: `${prefix}${message}` };

  if (LocalLoggerConfig.showDataField && params?.data) {
    payload["data"] = params.data;
  }
  if (LocalLoggerConfig.showErrors && error != null) {
    payload["error"] = error;
  }

  return payload;
}

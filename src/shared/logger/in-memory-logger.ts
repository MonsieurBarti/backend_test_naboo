import { BaseLogger, ChildLoggerContext, LogParams } from "./logger";

export interface CapturedLog {
  level: "log" | "warn" | "debug" | "error";
  message: string;
  params?: LogParams;
  error?: unknown;
}

export class InMemoryLogger extends BaseLogger {
  private readonly logs: CapturedLog[] = [];

  log(message: string, params?: LogParams): void {
    this.logs.push({ level: "log", message, params });
  }

  warn(message: string, params?: LogParams): void {
    this.logs.push({ level: "warn", message, params });
  }

  debug(message: string, params?: LogParams): void {
    this.logs.push({ level: "debug", message, params });
  }

  error(message: string, error: unknown, params?: LogParams): void {
    this.logs.push({ level: "error", message, error, params });
  }

  createChild(_context: ChildLoggerContext): BaseLogger {
    return this; // same instance — all logs captured in one place
  }

  getLogMessages(): string[] {
    return this.logs.map((l) => l.message);
  }

  hasLoggedMessage(message: string): boolean {
    return this.logs.some((l) => l.message.includes(message));
  }

  clear(): void {
    this.logs.length = 0;
  }
}

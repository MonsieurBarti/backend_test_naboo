export interface LogParams {
  data?: Record<string, unknown>;
  correlationId?: string;
  functionName?: string;
  entityId?: string;
}

export interface ChildLoggerContext {
  moduleName?: string;
  className?: string;
}

export abstract class BaseLogger {
  abstract log(message: string, params?: LogParams): void;
  abstract warn(message: string, params?: LogParams): void;
  abstract debug(message: string, params?: LogParams): void;
  abstract error(message: string, error: unknown, params?: LogParams): void;
  abstract createChild(context: ChildLoggerContext): BaseLogger;
}

export abstract class BaseDomainError extends Error {
  abstract readonly errorCode: string;
  readonly reportToMonitoring: boolean;
  readonly correlationId?: string;
  readonly metadata?: Record<string, unknown>;
  readonly timestamp = new Date();

  constructor(
    message: string,
    options?: {
      reportToMonitoring?: boolean;
      correlationId?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    super(message);
    this.name = this.constructor.name;
    this.reportToMonitoring = options?.reportToMonitoring ?? false;
    this.correlationId = options?.correlationId;
    this.metadata = options?.metadata;
  }
}

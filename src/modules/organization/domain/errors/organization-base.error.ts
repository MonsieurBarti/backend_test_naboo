import { BaseDomainError } from "../../../../shared/errors/base-domain.error";

export abstract class OrganizationBaseError extends BaseDomainError {
  abstract override readonly errorCode: string;
}

export class SlugAlreadyTakenError extends OrganizationBaseError {
  override readonly errorCode = "ORGANIZATION.SLUG_ALREADY_TAKEN";

  constructor(slug: string, options: { correlationId: string }) {
    super(`The slug "${slug}" is already taken`, {
      reportToMonitoring: false,
      correlationId: options.correlationId,
      metadata: { slug },
    });
  }
}

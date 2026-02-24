import { Inject, Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { TypedQuery } from "../../../../../shared/cqrs/typed-query";
import type { IRegistrationRepository } from "../../../domain/registration/registration.repository";
import { REGISTRATION_REPOSITORY } from "../../../registration.tokens";

export interface RegistrationReadModel {
  id: string;
  occurrenceId: string;
  organizationId: string;
  userId: string;
  seatCount: number;
  status: string;
  occurrenceStartDate: Date;
  occurrenceEndDate: Date;
  eventTitle: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RegistrationPaginatedResult {
  items: RegistrationReadModel[];
  hasNextPage: boolean;
  totalCount: number;
}

export class GetRegistrationsQuery extends TypedQuery<RegistrationPaginatedResult> {
  constructor(
    public readonly props: {
      readonly userId: string;
      readonly organizationId: string;
      readonly includeCancelled?: boolean;
      readonly first: number;
      readonly after?: string;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@QueryHandler(GetRegistrationsQuery)
@Injectable()
export class GetRegistrationsHandler
  implements IQueryHandler<GetRegistrationsQuery, RegistrationPaginatedResult>
{
  constructor(
    @Inject(REGISTRATION_REPOSITORY)
    private readonly registrationRepo: IRegistrationRepository,
  ) {}

  async execute(query: GetRegistrationsQuery): Promise<RegistrationPaginatedResult> {
    const { userId, organizationId, includeCancelled, first, after } = query.props;

    const result = await this.registrationRepo.findByUserInOrganization({
      userId,
      organizationId,
      includeCancelled,
      first,
      after,
    });

    const items: RegistrationReadModel[] = result.items.map((reg) => ({
      id: reg.id,
      occurrenceId: reg.occurrenceId,
      organizationId: reg.organizationId,
      userId: reg.userId,
      seatCount: reg.seatCount,
      status: reg.status,
      occurrenceStartDate: reg.occurrenceStartDate,
      occurrenceEndDate: reg.occurrenceEndDate,
      eventTitle: reg.eventTitle,
      createdAt: reg.createdAt,
      updatedAt: reg.updatedAt,
    }));

    return { items, hasNextPage: result.hasNextPage, totalCount: result.totalCount };
  }
}

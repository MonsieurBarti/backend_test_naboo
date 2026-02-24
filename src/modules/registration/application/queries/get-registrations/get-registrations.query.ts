import { Inject, Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { ClsService } from "nestjs-cls";
import { TypedQuery } from "../../../../../shared/cqrs/typed-query";
import { CacheService } from "../../../../../shared/redis/cache.service";
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
    private readonly cls: ClsService,
    private readonly cacheService: CacheService,
  ) {}

  async execute(query: GetRegistrationsQuery): Promise<RegistrationPaginatedResult> {
    const { userId, organizationId, includeCancelled, first, after } = query.props;

    const tenantId = this.cls.get<string>("tenantId");
    const stableHash = JSON.stringify({
      ic: includeCancelled,
      f: first,
      a: after,
    });
    const cacheKey = `${tenantId}:registrations:list:${userId}:${stableHash}`;

    const cached = await this.cacheService.get<RegistrationPaginatedResult>(cacheKey);
    if (cached !== null) {
      return cached;
    }

    const repoResult = await this.registrationRepo.findByUserInOrganization({
      userId,
      organizationId,
      includeCancelled,
      first,
      after,
    });

    const items: RegistrationReadModel[] = repoResult.items.map((reg) => ({
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

    const result: RegistrationPaginatedResult = {
      items,
      hasNextPage: repoResult.hasNextPage,
      totalCount: repoResult.totalCount,
    };
    await this.cacheService.set(cacheKey, result, 30);
    return result;
  }
}

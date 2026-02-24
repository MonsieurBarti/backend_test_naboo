import { Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TypedQuery } from "../../../../../shared/cqrs/typed-query";
import { decodeCursor } from "../../../../../shared/graphql/relay-pagination";
import type { RegistrationDocument } from "../../../infrastructure/registration/registration.schema";

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
    @InjectModel("Registration")
    private readonly model: Model<RegistrationDocument>,
  ) {}

  async execute(query: GetRegistrationsQuery): Promise<RegistrationPaginatedResult> {
    const { userId, organizationId, includeCancelled, first, after } = query.props;

    const baseFilter: Record<string, unknown> = {
      organizationId,
      userId,
      ...(includeCancelled ? {} : { status: "active" }),
    };

    const countFilter = { ...baseFilter };

    if (after !== undefined) {
      baseFilter["_id"] = { $gt: decodeCursor(after) };
    }

    const [docs, totalCount] = await Promise.all([
      this.model
        .find(baseFilter)
        .sort({ _id: 1 })
        .limit(first + 1)
        .lean<RegistrationDocument[]>()
        .exec(),
      this.model.countDocuments(countFilter).exec(),
    ]);

    const hasNextPage = docs.length > first;
    if (hasNextPage) docs.pop();

    const items: RegistrationReadModel[] = docs.map((doc) => ({
      id: doc._id,
      occurrenceId: doc.occurrenceId,
      organizationId: doc.organizationId,
      userId: doc.userId,
      seatCount: doc.seatCount,
      status: doc.status,
      occurrenceStartDate: doc.occurrenceStartDate,
      occurrenceEndDate: doc.occurrenceEndDate,
      eventTitle: doc.eventTitle,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));

    return { items, hasNextPage, totalCount };
  }
}

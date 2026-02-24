import { Injectable } from "@nestjs/common";
import { IQueryHandler, QueryHandler } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { TypedQuery } from "../../../../../shared/cqrs/typed-query";
import { OrganizationDocument } from "../../../infrastructure/organization/organization.schema";

export interface OrganizationReadModel {
  id: string;
  name: string;
  slug: string;
  createdAt: Date;
}

export type GetOrganizationQueryResult = OrganizationReadModel | null;

export class GetOrganizationQuery extends TypedQuery<GetOrganizationQueryResult> {
  constructor(
    public readonly props: {
      readonly id?: string;
      readonly slug?: string;
      readonly correlationId: string;
    },
  ) {
    super();
  }
}

@QueryHandler(GetOrganizationQuery)
@Injectable()
export class GetOrganizationHandler
  implements IQueryHandler<GetOrganizationQuery, GetOrganizationQueryResult>
{
  constructor(
    @InjectModel("Organization")
    private readonly model: Model<OrganizationDocument>,
  ) {}

  async execute(query: GetOrganizationQuery): Promise<GetOrganizationQueryResult> {
    const { id, slug } = query.props;

    let doc: OrganizationDocument | null = null;

    if (id) {
      doc = await this.model.findById(id).lean<OrganizationDocument>().exec();
    } else if (slug) {
      doc = await this.model.findOne({ slug }).lean<OrganizationDocument>().exec();
    }

    if (!doc) return null;

    return {
      id: doc._id,
      name: doc.name,
      slug: doc.slug,
      createdAt: doc.createdAt,
    };
  }
}

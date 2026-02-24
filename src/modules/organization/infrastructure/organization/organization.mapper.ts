import { Injectable } from "@nestjs/common";
import { EntityMapper } from "../../../../shared/db/mongoose-repository.base";
import { Organization } from "../../domain/organization/organization";
import { OrganizationDocument } from "./organization.schema";

@Injectable()
export class OrganizationMapper implements EntityMapper<Organization, OrganizationDocument> {
  toDomain(record: OrganizationDocument): Organization {
    return Organization.reconstitute({
      id: record._id,
      name: record.name,
      slug: record.slug,
      createdAt: record.createdAt,
    });
  }

  toPersistence(entity: Organization): OrganizationDocument {
    return {
      _id: entity.id,
      name: entity.name,
      slug: entity.slug,
      createdAt: entity.createdAt,
    };
  }
}

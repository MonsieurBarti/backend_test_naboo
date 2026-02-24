import { Injectable } from "@nestjs/common";
import { EventBus } from "@nestjs/cqrs";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, Model } from "mongoose";
import { MongooseRepositoryBase } from "../../../../shared/db/mongoose-repository.base";
import { SlugAlreadyTakenError } from "../../domain/errors/organization-base.error";
import { Organization } from "../../domain/organization/organization";
import { IOrganizationRepository } from "../../domain/organization/organization.repository";
import { OrganizationMapper } from "./organization.mapper";
import { OrganizationDocument } from "./organization.schema";

interface MongoServerError extends Error {
  code: number;
}

function isMongoServerError(err: unknown): err is MongoServerError {
  return (
    err instanceof Error && "code" in err && typeof (err as MongoServerError).code === "number"
  );
}

@Injectable()
export class MongooseOrganizationRepository
  extends MongooseRepositoryBase<Organization, OrganizationDocument>
  implements IOrganizationRepository
{
  protected readonly mapper: OrganizationMapper;

  constructor(
    @InjectModel("Organization")
    model: Model<OrganizationDocument>,
    eventBus: EventBus,
  ) {
    super(model, eventBus);
    this.mapper = new OrganizationMapper();
  }

  override async save(entity: Organization, session?: ClientSession): Promise<void> {
    try {
      await super.save(entity, session);
    } catch (err: unknown) {
      if (isMongoServerError(err) && err.code === 11000) {
        throw new SlugAlreadyTakenError(entity.slug, {
          correlationId: "repository",
        });
      }
      throw err;
    }
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    const doc = await this.model.findOne({ slug }).lean<OrganizationDocument>().exec();
    return doc ? this.mapper.toDomain(doc) : null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    const result = await this.model.exists({ slug });
    return result !== null;
  }
}

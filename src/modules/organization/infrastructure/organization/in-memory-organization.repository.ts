import { Injectable } from "@nestjs/common";
import { InMemoryRepositoryBase } from "../../../../shared/db/in-memory-repository.base";
import { Organization } from "../../domain/organization/organization";
import { IOrganizationRepository } from "../../domain/organization/organization.repository";

@Injectable()
export class InMemoryOrganizationRepository
  extends InMemoryRepositoryBase<Organization>
  implements IOrganizationRepository
{
  protected getId(entity: Organization): string {
    return entity.id;
  }

  protected publishEvents(_entity: Organization): void {
    // no-op in test double
  }

  async findBySlug(slug: string): Promise<Organization | null> {
    for (const org of this.store.values()) {
      if (org.slug === slug) return org;
    }
    return null;
  }

  async existsBySlug(slug: string): Promise<boolean> {
    for (const org of this.store.values()) {
      if (org.slug === slug) return true;
    }
    return false;
  }
}

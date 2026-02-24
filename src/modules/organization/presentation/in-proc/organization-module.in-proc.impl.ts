import { Inject, Injectable } from "@nestjs/common";
import {
  IOrganizationModuleInProc,
  type OrganizationTenantReadModel,
} from "../../../../shared/in-proc/organization-module.in-proc";
import { IOrganizationRepository } from "../../domain/organization/organization.repository";
import { ORGANIZATION_TOKENS } from "../../organization.tokens";

@Injectable()
export class OrganizationModuleInProcImpl extends IOrganizationModuleInProc {
  constructor(
    @Inject(ORGANIZATION_TOKENS.ORGANIZATION_REPOSITORY)
    private readonly orgRepo: IOrganizationRepository,
  ) {
    super();
  }

  async findById(id: string): Promise<OrganizationTenantReadModel | null> {
    const org = await this.orgRepo.findById(id);
    if (org === null) return null;

    return {
      id: org.id,
      slug: org.slug,
    };
  }
}

export type OrganizationTenantReadModel = {
  id: string;
  slug: string;
};

export abstract class IOrganizationModuleInProc {
  abstract findById(id: string): Promise<OrganizationTenantReadModel | null>;
}

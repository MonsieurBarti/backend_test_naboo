import { Organization } from "./organization";

export abstract class IOrganizationRepository {
  abstract save(org: Organization): Promise<void>;
  abstract findById(id: string): Promise<Organization | null>;
  abstract findBySlug(slug: string): Promise<Organization | null>;
  abstract existsBySlug(slug: string): Promise<boolean>;
}

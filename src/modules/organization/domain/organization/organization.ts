import { randomUUID } from "node:crypto";
import { AggregateRoot } from "@nestjs/cqrs";
import { z } from "zod";

export const OrganizationPropsSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  slug: z.string(),
  createdAt: z.coerce.date(),
});

export type OrganizationProps = z.infer<typeof OrganizationPropsSchema>;

export class Organization extends AggregateRoot {
  private constructor(private readonly props: OrganizationProps) {
    super();
  }

  static create(name: string, slug: string, createdAt: Date): Organization {
    const validated = OrganizationPropsSchema.parse({ id: randomUUID(), name, slug, createdAt });
    return new Organization(validated);
  }

  static reconstitute(props: OrganizationProps): Organization {
    return new Organization(OrganizationPropsSchema.parse(props));
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }
}

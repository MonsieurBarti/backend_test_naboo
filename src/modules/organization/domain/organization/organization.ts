import { randomUUID } from "node:crypto";
import { AggregateRoot } from "@nestjs/cqrs";
import { IDateProvider } from "src/shared/date/date-provider";
import { ZodError, z } from "zod";

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

  static createNew(name: string, slug: string, dateProvider: IDateProvider): Organization {
    const validated = OrganizationPropsSchema.parse({
      id: randomUUID(),
      name,
      slug,
      createdAt: dateProvider.now(),
    });
    return new Organization(validated);
  }

  static create(props: OrganizationProps): Organization {
    try {
      const validated = OrganizationPropsSchema.parse(props);
      return new Organization(validated);
    } catch (error) {
      if (error instanceof ZodError) throw error;
      throw error;
    }
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

  toJSON(): OrganizationProps {
    return { ...this.props };
  }
}

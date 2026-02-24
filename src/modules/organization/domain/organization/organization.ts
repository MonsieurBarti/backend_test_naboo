import { randomUUID } from "node:crypto";
import { AggregateRoot } from "@nestjs/cqrs";

export interface OrganizationProps {
  readonly id: string;
  readonly name: string;
  readonly slug: string;
  readonly createdAt: Date;
}

export class Organization extends AggregateRoot {
  private constructor(private readonly props: OrganizationProps) {
    super();
  }

  static create(name: string, slug: string, createdAt: Date): Organization {
    return new Organization({ id: randomUUID(), name, slug, createdAt });
  }

  static reconstitute(props: OrganizationProps): Organization {
    return new Organization(props);
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

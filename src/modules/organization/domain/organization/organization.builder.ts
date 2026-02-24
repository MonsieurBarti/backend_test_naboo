import { faker } from "@faker-js/faker";
import { Organization } from "./organization";
import { generateSlug } from "./slug";

export class OrganizationBuilder {
  private id: string = faker.string.uuid();
  private name: string = faker.company.name();
  private slug: string = generateSlug(faker.company.name());
  private createdAt: Date = faker.date.past();

  withId(id: string): this {
    this.id = id;
    return this;
  }

  withName(name: string): this {
    this.name = name;
    return this;
  }

  withSlug(slug: string): this {
    this.slug = slug;
    return this;
  }

  build(): Organization {
    return Organization.create({
      id: this.id,
      name: this.name,
      slug: this.slug,
      createdAt: this.createdAt,
    });
  }
}

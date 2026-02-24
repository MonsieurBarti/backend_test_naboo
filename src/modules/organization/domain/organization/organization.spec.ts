import { Organization } from "src/modules/organization/domain/organization/organization";
import { OrganizationBuilder } from "src/modules/organization/domain/organization/organization.builder";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { describe, expect, it } from "vitest";
import { ZodError } from "zod";

describe("Organization", () => {
  const dateProvider = new FakeDateProvider(new Date("2024-06-15T12:00:00.000Z"));

  describe("createNew", () => {
    it("creates an organization with a generated UUID, correct name, slug, and createdAt from dateProvider", () => {
      const org = Organization.createNew("Acme Corp", "acme-corp", dateProvider);

      expect(org.name).toBe("Acme Corp");
      expect(org.slug).toBe("acme-corp");
      expect(org.createdAt).toEqual(new Date("2024-06-15T12:00:00.000Z"));
      expect(org.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
    });

    it("generates a unique UUID each call", () => {
      const org1 = Organization.createNew("Org 1", "org-1", dateProvider);
      const org2 = Organization.createNew("Org 2", "org-2", dateProvider);

      expect(org1.id).not.toBe(org2.id);
    });

    it("uses the date from dateProvider for createdAt", () => {
      const customDate = new FakeDateProvider(new Date("2025-01-01T00:00:00.000Z"));
      const org = Organization.createNew("Test Org", "test-org", customDate);

      expect(org.createdAt).toEqual(new Date("2025-01-01T00:00:00.000Z"));
    });
  });

  describe("create (reconstitution)", () => {
    it("reconstitutes an organization with exact props", () => {
      const props = {
        id: "550e8400-e29b-41d4-a716-446655440000",
        name: "Test Org",
        slug: "test-org",
        createdAt: new Date("2023-01-01T00:00:00.000Z"),
      };

      const org = Organization.create(props);

      expect(org.id).toBe(props.id);
      expect(org.name).toBe(props.name);
      expect(org.slug).toBe(props.slug);
      expect(org.createdAt).toEqual(props.createdAt);
    });

    it("does not generate a new date — uses props exactly", () => {
      const builder = new OrganizationBuilder();
      const built = builder.build();
      const reconstituted = Organization.create(built.toJSON());

      expect(reconstituted.createdAt).toEqual(built.createdAt);
    });

    it("throws ZodError when props are invalid", () => {
      expect(() =>
        Organization.create({
          id: "not-a-uuid",
          name: "Test",
          slug: "test",
          createdAt: new Date(),
        }),
      ).toThrowError(ZodError);
    });

    it("throws ZodError when required field is missing", () => {
      expect(() =>
        Organization.create({
          // biome-ignore lint/suspicious/noExplicitAny: testing invalid props
          id: undefined as any,
          name: "Test",
          slug: "test",
          createdAt: new Date(),
        }),
      ).toThrowError(ZodError);
    });
  });

  describe("toJSON", () => {
    it("returns all props matching the getters", () => {
      const org = new OrganizationBuilder().build();
      const json = org.toJSON();

      expect(json.id).toBe(org.id);
      expect(json.name).toBe(org.name);
      expect(json.slug).toBe(org.slug);
      expect(json.createdAt).toEqual(org.createdAt);
    });

    it("returns a new object (not the same reference)", () => {
      const org = new OrganizationBuilder().build();
      const json1 = org.toJSON();
      const json2 = org.toJSON();

      expect(json1).not.toBe(json2);
      expect(json1).toEqual(json2);
    });

    it("round-trips through create correctly", () => {
      const original = new OrganizationBuilder().build();
      const reconstituted = Organization.create(original.toJSON());

      expect(reconstituted.toJSON()).toEqual(original.toJSON());
    });
  });
});

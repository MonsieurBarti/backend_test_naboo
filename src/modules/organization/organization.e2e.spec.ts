import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { TestApp } from "../../shared/testing/e2e-app.factory";
import { createTestApp, gqlRequest } from "../../shared/testing/e2e-app.factory";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function hasStringField(obj: Record<string, unknown>, key: string): boolean {
  return typeof obj[key] === "string";
}

describe("Organization (e2e)", () => {
  let testApp: TestApp;
  let createdOrgId: string;
  let createdOrgSlug: string;
  const orgName = `Test Org ${randomUUID().slice(0, 8)}`;

  beforeAll(async () => {
    testApp = await createTestApp();
  });

  afterAll(async () => {
    await testApp?.app?.close();
  });

  it("should create an organization via GraphQL mutation", async () => {
    const mutation = `
      mutation CreateOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          ... on CreateOrganizationSuccess {
            id
            name
            slug
          }
          ... on SlugAlreadyTakenErrorType {
            message
            slug
          }
        }
      }
    `;

    const response = await gqlRequest(testApp.app, mutation, { input: { name: orgName } });

    expect(response.errors).toBeUndefined();

    const result = response.data.createOrganization;
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;

    // Must be CreateOrganizationSuccess (has id field)
    expect(hasStringField(result, "id")).toBe(true);
    expect(typeof result.id).toBe("string");
    expect(typeof result.name).toBe("string");
    expect(result.name).toBe(orgName);
    expect(typeof result.slug).toBe("string");

    createdOrgId = String(result.id);
    createdOrgSlug = String(result.slug);
  });

  it("should query organization by slug", async () => {
    const query = `
      query GetOrganization($slug: String) {
        organization(slug: $slug) {
          id
          name
          slug
        }
      }
    `;

    const response = await gqlRequest(testApp.app, query, { slug: createdOrgSlug });

    expect(response.errors).toBeUndefined();

    const org = response.data.organization;
    expect(isRecord(org)).toBe(true);
    if (!isRecord(org)) return;

    expect(org.id).toBe(createdOrgId);
    expect(org.name).toBe(orgName);
    expect(org.slug).toBe(createdOrgSlug);
  });

  it("should return null for a non-existent slug", async () => {
    const query = `
      query GetOrganization($slug: String) {
        organization(slug: $slug) {
          id
          name
          slug
        }
      }
    `;

    const response = await gqlRequest(testApp.app, query, { slug: "non-existent-slug-xyz" });

    expect(response.errors).toBeUndefined();
    expect(response.data.organization).toBeNull();
  });

  it("should return error for duplicate organization name", async () => {
    const mutation = `
      mutation CreateOrganization($input: CreateOrganizationInput!) {
        createOrganization(input: $input) {
          ... on CreateOrganizationSuccess {
            id
            name
            slug
          }
          ... on SlugAlreadyTakenErrorType {
            message
            slug
          }
        }
      }
    `;

    // Try to create with the same name (same slug) as the first test
    const response = await gqlRequest(testApp.app, mutation, { input: { name: orgName } });

    expect(response.errors).toBeUndefined();

    const result = response.data.createOrganization;
    expect(isRecord(result)).toBe(true);
    if (!isRecord(result)) return;

    // Must be SlugAlreadyTakenErrorType (has message but not id)
    expect(hasStringField(result, "message")).toBe(true);
    expect(hasStringField(result, "id")).toBe(false);
    expect(hasStringField(result, "slug")).toBe(true);
    expect(result.slug).toBe(createdOrgSlug);
  });
});

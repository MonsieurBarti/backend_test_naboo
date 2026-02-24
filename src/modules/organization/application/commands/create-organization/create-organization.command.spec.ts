import { randomUUID } from "node:crypto";
import { OrganizationBuilder } from "src/modules/organization/domain/organization/organization.builder";
import { InMemoryOrganizationRepository } from "src/modules/organization/infrastructure/organization/in-memory-organization.repository";
import { FakeDateProvider } from "src/shared/testing/fake-date-provider";
import { beforeEach, describe, expect, it } from "vitest";
import { SlugAlreadyTakenError } from "../../../domain/errors/organization-base.error";
import {
  CreateOrganizationCommand,
  CreateOrganizationHandler,
} from "./create-organization.command";

describe("CreateOrganizationHandler", () => {
  let orgRepo: InMemoryOrganizationRepository;
  let dateProvider: FakeDateProvider;
  let handler: CreateOrganizationHandler;

  const NOW = new Date("2026-02-24T10:00:00Z");

  beforeEach(() => {
    orgRepo = new InMemoryOrganizationRepository();
    dateProvider = new FakeDateProvider(NOW);
    handler = new CreateOrganizationHandler(orgRepo, dateProvider);
  });

  it("should create an organization with generated slug", async () => {
    // Arrange
    const command = new CreateOrganizationCommand({
      name: "Acme Corp",
      correlationId: randomUUID(),
    });

    // Act
    await handler.execute(command);

    // Assert — org saved with generated slug
    const saved = await orgRepo.findBySlug("acme-corp");
    expect(saved).not.toBeNull();
    expect(saved?.slug).toBe("acme-corp");
    expect(saved?.name).toBe("Acme Corp");
    expect(saved?.createdAt).toEqual(NOW);
  });

  it("should throw SlugAlreadyTakenError when slug already exists", async () => {
    // Arrange — pre-save an org with slug "acme-corp"
    const existing = new OrganizationBuilder().withSlug("acme-corp").build();
    await orgRepo.save(existing);

    const command = new CreateOrganizationCommand({
      name: "Acme Corp",
      correlationId: randomUUID(),
    });

    // Act & Assert
    await expect(handler.execute(command)).rejects.toThrow(SlugAlreadyTakenError);
  });
});

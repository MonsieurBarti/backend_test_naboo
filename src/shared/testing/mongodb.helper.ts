import { randomUUID } from "node:crypto";
import type { Connection } from "mongoose";

/**
 * Truncates the specified collections in the given Mongoose connection.
 * Handles missing collections gracefully by ignoring NamespaceNotFound errors.
 */
export async function truncateCollections(
  connection: Connection,
  collectionNames: string[],
): Promise<void> {
  if (!connection) {
    throw new Error("truncateCollections called with undefined connection — did beforeAll fail?");
  }
  await Promise.all(
    collectionNames.map(async (name) => {
      try {
        await connection.collection(name).deleteMany({});
      } catch (err: unknown) {
        // Ignore "namespace not found" — collection may not exist yet
        if (
          err instanceof Error &&
          (err.message.includes("ns not found") || err.message.includes("NamespaceNotFound"))
        ) {
          return;
        }
        throw err;
      }
    }),
  );
}

/**
 * Generates a unique tenant ID (UUID) for test isolation.
 * Use as the tenantId in integration tests to avoid cross-test collection pollution.
 */
export function generateTestTenantId(): string {
  return randomUUID();
}

/**
 * Generates a short tenant slug for use as a collection prefix in tenant-scoped queries.
 * Format: "test-{8 hex chars}" — unique per test file.
 */
export function generateTestTenantSlug(): string {
  return `test-${randomUUID().slice(0, 8)}`;
}

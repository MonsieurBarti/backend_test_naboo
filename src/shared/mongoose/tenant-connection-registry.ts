import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Model, Schema } from "mongoose";

@Injectable()
export class TenantConnectionRegistry {
  private readonly registeredModels = new Set<string>();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Returns a tenant-scoped Mongoose model, creating and caching it on first call.
   *
   * Collection naming: `{tenantSlug}_{modelName_lowercase}` (e.g. "acme-corp_events")
   * All callers pass the org slug (from CLS) as the collection prefix — not the raw tenantId.
   *
   * Cache key: `{tenantSlug}:{modelName}` — used as the Mongoose model name to prevent
   * OverwriteModelError when the same logical model is registered for multiple tenants.
   */
  getModel<T>(tenantId: string, modelName: string, schema: Schema<T>): Model<T> {
    const cacheKey = `${tenantId}:${modelName}`;

    if (this.registeredModels.has(cacheKey)) {
      return this.connection.model<T>(cacheKey);
    }

    // Collection name: "{tenantId}_{modelName_lowercase}" e.g. "64a1b2c3_events"
    const collectionName = `${tenantId}_${modelName.toLowerCase()}`;
    // Use cacheKey as Mongoose model name to avoid OverwriteModelError across tenants
    const model = this.connection.model<T>(cacheKey, schema, collectionName);
    this.registeredModels.add(cacheKey);
    return model;
  }
}

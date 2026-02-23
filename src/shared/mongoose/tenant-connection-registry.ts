import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { Connection, Model, Schema } from "mongoose";

@Injectable()
export class TenantConnectionRegistry {
  private readonly modelCache = new Map<string, Model<unknown>>();

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Returns a tenant-scoped Mongoose model, creating and caching it on first call.
   *
   * Collection naming: `{tenantId}_{modelName_lowercase}` (e.g. "64a1b2c3_events")
   * Phase 1 uses raw tenantId from header (org ObjectId string).
   * Phase 2 may update to use org slug as the collection prefix.
   *
   * Cache key: `{tenantId}:{modelName}` — used as the Mongoose model name to prevent
   * OverwriteModelError when the same logical model is registered for multiple tenants.
   */
  getModel<T>(tenantId: string, modelName: string, schema: Schema): Model<T> {
    const cacheKey = `${tenantId}:${modelName}`;
    const cached = this.modelCache.get(cacheKey);
    if (cached) return cached as Model<T>;

    // Collection name: "{tenantId}_{modelName_lowercase}" e.g. "64a1b2c3_events"
    const collectionName = `${tenantId}_${modelName.toLowerCase()}`;
    // Use cacheKey as Mongoose model name to avoid OverwriteModelError across tenants
    const model = this.connection.model<T>(cacheKey, schema, collectionName);
    this.modelCache.set(cacheKey, model as unknown as Model<unknown>);
    return model;
  }
}

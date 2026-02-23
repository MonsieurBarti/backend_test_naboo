import { AggregateRoot, EventBus } from "@nestjs/cqrs";
import { ClientSession, Model, UpdateQuery } from "mongoose";

/**
 * Maps between a domain aggregate and its persistence representation.
 * Subclass repositories must declare a concrete mapper implementing this interface.
 */
export interface EntityMapper<Entity, DbRecord> {
  toDomain(record: DbRecord): Entity;
  toPersistence(entity: Entity): DbRecord;
}

/**
 * Base repository providing Mongoose-backed persistence with domain event publishing.
 *
 * Replaces SqlRepositoryBase with an identical public contract (save, findById, delete)
 * plus withTransaction() for atomic multi-step operations.
 *
 * WARNING: Inside a withTransaction() callback, every call to save(), findById(), and
 * delete() MUST pass the provided session argument. Omitting session means the operation
 * runs outside the transaction and will NOT be rolled back on failure.
 */
export abstract class MongooseRepositoryBase<TAggregate extends AggregateRoot, TDocument> {
  protected abstract readonly mapper: EntityMapper<TAggregate, TDocument>;

  constructor(
    protected readonly model: Model<TDocument>,
    private readonly eventBus: EventBus,
  ) {}

  async save(entity: TAggregate, session?: ClientSession): Promise<void> {
    const doc = this.mapper.toPersistence(entity);
    const id = (doc as Record<string, unknown>)["_id"];
    await this.model.findOneAndUpdate({ _id: id }, doc as UpdateQuery<TDocument>, {
      upsert: true,
      new: true,
      session,
    });
    this.publishEvents(entity);
  }

  async findById(id: string, session?: ClientSession): Promise<TAggregate | null> {
    const doc = await this.model.findById(id, null, { session }).lean().exec();
    return doc ? this.mapper.toDomain(doc as TDocument) : null;
  }

  async delete(entity: TAggregate, session?: ClientSession): Promise<void> {
    const doc = this.mapper.toPersistence(entity);
    const id = (doc as Record<string, unknown>)["_id"];
    await this.model.findByIdAndDelete(id, { session });
    this.publishEvents(entity);
  }

  /**
   * Runs fn inside a Mongoose client session transaction.
   *
   * The session is automatically ended in the finally block regardless of outcome.
   * The caller receives the session via the callback parameter and MUST pass it
   * to every repository operation inside the callback.
   */
  async withTransaction<T>(fn: (session: ClientSession) => Promise<T>): Promise<T> {
    const session = await this.model.db.startSession();
    try {
      let result!: T;
      await session.withTransaction(async () => {
        result = await fn(session);
      });
      return result;
    } finally {
      await session.endSession();
    }
  }

  protected publishEvents(entity: AggregateRoot): void {
    const events = entity.getUncommittedEvents();
    if (events.length > 0) {
      this.eventBus.publishAll(events);
      entity.uncommit();
    }
  }
}

import { AggregateRoot } from "@nestjs/cqrs";

/**
 * Shared base class for unit test in-memory repositories.
 *
 * Subclasses implement getId() and publishEvents() to adapt to the specific aggregate.
 * This eliminates Map-based store boilerplate across every module's test doubles.
 */
export abstract class InMemoryRepositoryBase<TAggregate extends AggregateRoot> {
  protected readonly store = new Map<string, TAggregate>();

  async save(entity: TAggregate): Promise<void> {
    const id = this.getId(entity);
    this.store.set(id, entity);
    this.publishEvents(entity);
  }

  async findById(id: string): Promise<TAggregate | null> {
    return this.store.get(id) ?? null;
  }

  async delete(entity: TAggregate): Promise<void> {
    const id = this.getId(entity);
    this.store.delete(id);
    this.publishEvents(entity);
  }

  protected abstract getId(entity: TAggregate): string;
  protected abstract publishEvents(entity: TAggregate): void;
}

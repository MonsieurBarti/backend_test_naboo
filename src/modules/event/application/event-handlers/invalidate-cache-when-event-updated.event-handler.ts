import { Inject } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { InjectLogger } from "../../../../shared/logger/inject-logger.decorator";
import { BaseLogger } from "../../../../shared/logger/logger";
import { CacheService } from "../../../../shared/redis/cache.service";
import { EventUpdatedEvent } from "../../domain/events/event-updated.event";

@EventsHandler(EventUpdatedEvent)
export class InvalidateCacheWhenEventUpdatedHandler implements IEventHandler<EventUpdatedEvent> {
  private readonly logger: BaseLogger;

  constructor(
    @Inject(CacheService)
    private readonly cacheService: CacheService,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "event",
      className: InvalidateCacheWhenEventUpdatedHandler.name,
    });
  }

  async handle(event: EventUpdatedEvent): Promise<void> {
    this.logger.debug("invalidating events and occurrences cache on update", {
      data: { aggregateId: event.aggregateId, organizationId: event.organizationId },
    });
    await this.cacheService.delPattern(`${event.organizationId}:events:*`);
    await this.cacheService.delPattern(
      `${event.organizationId}:occurrences:list:${event.aggregateId}:*`,
    );
  }
}

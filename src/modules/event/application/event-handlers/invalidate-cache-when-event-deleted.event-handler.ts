import { Inject } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { InjectLogger } from "../../../../shared/logger/inject-logger.decorator";
import { BaseLogger } from "../../../../shared/logger/logger";
import { CacheService } from "../../../../shared/redis/cache.service";
import { EventDeletedEvent } from "../../domain/events/event-deleted.event";

@EventsHandler(EventDeletedEvent)
export class InvalidateCacheWhenEventDeletedHandler implements IEventHandler<EventDeletedEvent> {
  private readonly logger: BaseLogger;

  constructor(
    @Inject(CacheService)
    private readonly cacheService: CacheService,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "event",
      className: InvalidateCacheWhenEventDeletedHandler.name,
    });
  }

  async handle(event: EventDeletedEvent): Promise<void> {
    this.logger.debug("invalidating events and occurrences cache on deletion", {
      data: { aggregateId: event.aggregateId, organizationId: event.organizationId },
    });
    await this.cacheService.delPattern(`${event.organizationId}:events:*`);
    await this.cacheService.delPattern(
      `${event.organizationId}:occurrences:list:${event.aggregateId}:*`,
    );
  }
}

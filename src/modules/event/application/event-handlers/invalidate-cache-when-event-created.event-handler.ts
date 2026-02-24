import { Inject } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { InjectLogger } from "../../../../shared/logger/inject-logger.decorator";
import { BaseLogger } from "../../../../shared/logger/logger";
import { CacheService } from "../../../../shared/redis/cache.service";
import { EventCreatedEvent } from "../../domain/events/event-created.event";

@EventsHandler(EventCreatedEvent)
export class InvalidateCacheWhenEventCreatedHandler implements IEventHandler<EventCreatedEvent> {
  private readonly logger: BaseLogger;

  constructor(
    @Inject(CacheService)
    private readonly cacheService: CacheService,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "event",
      className: InvalidateCacheWhenEventCreatedHandler.name,
    });
  }

  async handle(event: EventCreatedEvent): Promise<void> {
    this.logger.debug("invalidating events cache on creation", {
      data: { aggregateId: event.aggregateId, organizationId: event.organizationId },
    });
    await this.cacheService.delPattern(`${event.organizationId}:events:*`);
  }
}

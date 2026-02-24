import { Inject } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { InjectLogger } from "../../../../shared/logger/inject-logger.decorator";
import { BaseLogger } from "../../../../shared/logger/logger";
import { CacheService } from "../../../../shared/redis/cache.service";
import { RegistrationCreatedEvent } from "../../domain/events/registration-created.event";

@EventsHandler(RegistrationCreatedEvent)
export class InvalidateCacheWhenRegistrationCreatedHandler
  implements IEventHandler<RegistrationCreatedEvent>
{
  private readonly logger: BaseLogger;

  constructor(
    @Inject(CacheService)
    private readonly cacheService: CacheService,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "registration",
      className: InvalidateCacheWhenRegistrationCreatedHandler.name,
    });
  }

  async handle(event: RegistrationCreatedEvent): Promise<void> {
    this.logger.debug("invalidating registrations cache on creation", {
      data: { aggregateId: event.aggregateId, organizationId: event.organizationId },
    });
    await this.cacheService.delPattern(`${event.organizationId}:registrations:*`);
  }
}

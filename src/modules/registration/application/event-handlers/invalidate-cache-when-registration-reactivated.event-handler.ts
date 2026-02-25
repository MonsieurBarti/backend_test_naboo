import { Inject } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { InjectLogger } from "../../../../shared/logger/inject-logger.decorator";
import { BaseLogger } from "../../../../shared/logger/logger";
import { CacheService } from "../../../../shared/redis/cache.service";
import { RegistrationReactivatedEvent } from "../../domain/events/registration-reactivated.event";

@EventsHandler(RegistrationReactivatedEvent)
export class InvalidateCacheWhenRegistrationReactivatedHandler
  implements IEventHandler<RegistrationReactivatedEvent>
{
  private readonly logger: BaseLogger;

  constructor(
    @Inject(CacheService)
    private readonly cacheService: CacheService,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "registration",
      className: InvalidateCacheWhenRegistrationReactivatedHandler.name,
    });
  }

  async handle(event: RegistrationReactivatedEvent): Promise<void> {
    this.logger.debug("invalidating registrations cache on reactivation", {
      data: { aggregateId: event.aggregateId, organizationId: event.organizationId },
    });
    await this.cacheService.delPattern(`${event.organizationId}:registrations:*`);
  }
}

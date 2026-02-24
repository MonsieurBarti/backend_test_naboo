import { Inject } from "@nestjs/common";
import { EventsHandler, type IEventHandler } from "@nestjs/cqrs";
import { InjectLogger } from "../../../../shared/logger/inject-logger.decorator";
import { BaseLogger } from "../../../../shared/logger/logger";
import { CacheService } from "../../../../shared/redis/cache.service";
import { RegistrationCancelledEvent } from "../../domain/events/registration-cancelled.event";

@EventsHandler(RegistrationCancelledEvent)
export class InvalidateCacheWhenRegistrationCancelledHandler
  implements IEventHandler<RegistrationCancelledEvent>
{
  private readonly logger: BaseLogger;

  constructor(
    @Inject(CacheService)
    private readonly cacheService: CacheService,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "registration",
      className: InvalidateCacheWhenRegistrationCancelledHandler.name,
    });
  }

  async handle(event: RegistrationCancelledEvent): Promise<void> {
    this.logger.debug("invalidating registrations cache on cancellation", {
      data: { aggregateId: event.aggregateId, organizationId: event.organizationId },
    });
    await this.cacheService.delPattern(`${event.organizationId}:registrations:*`);
  }
}

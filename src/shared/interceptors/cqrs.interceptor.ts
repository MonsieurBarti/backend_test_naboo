import { Injectable, OnModuleInit } from "@nestjs/common";
import { CommandBus, QueryBus, EventBus } from "@nestjs/cqrs";
import { BaseLogger } from "../logger/logger";
import { InjectLogger } from "../logger/inject-logger.decorator";

@Injectable()
export class CqrsInterceptor implements OnModuleInit {
  private readonly logger: BaseLogger;

  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
    private readonly eventBus: EventBus,
    @InjectLogger() logger: BaseLogger,
  ) {
    this.logger = logger.createChild({
      moduleName: "cqrs",
      className: CqrsInterceptor.name,
    });
  }

  onModuleInit(): void {
    this.commandBus.subscribe((command) => {
      this.logger.log(`${command.constructor.name} executed`, {
        data: { type: "command", command },
      });
    });

    this.queryBus.subscribe((query) => {
      this.logger.log(`${query.constructor.name} executed`, {
        data: { type: "query", query },
      });
    });

    this.eventBus.subscribe((event) => {
      this.logger.log(`${event.constructor.name} published`, {
        data: { type: "event", event },
      });
    });
  }
}

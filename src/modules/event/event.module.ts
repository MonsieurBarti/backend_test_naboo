import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DateProviderModule } from "src/shared/date/date-provider.module";
import { TypedCommandBus } from "../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../shared/cqrs/typed-query-bus";
import { IDateProvider } from "../../shared/date/date-provider";
import { DateProvider } from "../../shared/date/date-provider.impl";
import {
  commandHandlers,
  eventHandlers,
  queryHandlers,
} from "./application/event.application.module";
import { EVENT_TOKENS } from "./event.tokens";
import { EventMapper } from "./infrastructure/event/event.mapper";
import { MongooseEventRepository } from "./infrastructure/event/mongoose-event.repository";
import { MongooseOccurrenceRepository } from "./infrastructure/occurrence/mongoose-occurrence.repository";
import { OccurrenceMapper } from "./infrastructure/occurrence/occurrence.mapper";
import { EventResolver } from "./presentation/event.resolver";

@Module({
  imports: [CqrsModule, DateProviderModule],
  providers: [
    // Command, query, and event handlers (from application barrel)
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    // Resolver
    EventResolver,
    // Mappers
    EventMapper,
    OccurrenceMapper,
    // Typed buses
    TypedCommandBus,
    TypedQueryBus,
    // Date provider
    { provide: IDateProvider, useClass: DateProvider },
    // Repository tokens (used by command handlers only)
    { provide: EVENT_TOKENS.EVENT_REPOSITORY, useClass: MongooseEventRepository },
    { provide: EVENT_TOKENS.OCCURRENCE_REPOSITORY, useClass: MongooseOccurrenceRepository },
  ],
  exports: [EVENT_TOKENS.EVENT_REPOSITORY, EVENT_TOKENS.OCCURRENCE_REPOSITORY],
})
export class EventModule {}

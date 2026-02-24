import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DateProviderModule } from "src/shared/date/date-provider.module";
import { TypedCommandBus } from "../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../shared/cqrs/typed-query-bus";
import { IDateProvider } from "../../shared/date/date-provider";
import { DateProvider } from "../../shared/date/date-provider.impl";
import { CreateEventHandler } from "./application/commands/create-event/create-event.command";
import { DeleteEventHandler } from "./application/commands/delete-event/delete-event.command";
import { UpdateEventHandler } from "./application/commands/update-event/update-event.command";
import { InvalidateCacheWhenEventCreatedHandler } from "./application/event-handlers/invalidate-cache-when-event-created.event-handler";
import { InvalidateCacheWhenEventDeletedHandler } from "./application/event-handlers/invalidate-cache-when-event-deleted.event-handler";
import { InvalidateCacheWhenEventUpdatedHandler } from "./application/event-handlers/invalidate-cache-when-event-updated.event-handler";
import { GetEventsHandler } from "./application/queries/get-events/get-events.query";
import { GetOccurrencesHandler } from "./application/queries/get-occurrences/get-occurrences.query";
import { EVENT_TOKENS } from "./event.tokens";
import { EventMapper } from "./infrastructure/event/event.mapper";
import { MongooseEventRepository } from "./infrastructure/event/mongoose-event.repository";
import { MongooseOccurrenceRepository } from "./infrastructure/occurrence/mongoose-occurrence.repository";
import { OccurrenceMapper } from "./infrastructure/occurrence/occurrence.mapper";
import { EventResolver } from "./presentation/event.resolver";

@Module({
  imports: [CqrsModule, DateProviderModule],
  providers: [
    // Command handlers
    CreateEventHandler,
    UpdateEventHandler,
    DeleteEventHandler,
    // Query handlers (inject TenantConnectionRegistry + ClsService directly — no repositories)
    GetEventsHandler,
    GetOccurrencesHandler,
    // Cache invalidation event handlers
    InvalidateCacheWhenEventCreatedHandler,
    InvalidateCacheWhenEventUpdatedHandler,
    InvalidateCacheWhenEventDeletedHandler,
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

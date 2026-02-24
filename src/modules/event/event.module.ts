import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { TypedCommandBus } from "../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../shared/cqrs/typed-query-bus";
import { CreateEventHandler } from "./application/commands/create-event/create-event.command";
import { DeleteEventHandler } from "./application/commands/delete-event/delete-event.command";
import { UpdateEventHandler } from "./application/commands/update-event/update-event.command";
import { GetEventsHandler } from "./application/queries/get-events/get-events.query";
import { GetOccurrencesHandler } from "./application/queries/get-occurrences/get-occurrences.query";
import { EVENT_REPOSITORY, OCCURRENCE_REPOSITORY } from "./event.tokens";
import { EventMapper } from "./infrastructure/event/event.mapper";
import { MongooseEventRepository } from "./infrastructure/event/mongoose-event.repository";
import { MongooseOccurrenceRepository } from "./infrastructure/occurrence/mongoose-occurrence.repository";
import { OccurrenceMapper } from "./infrastructure/occurrence/occurrence.mapper";
import { EventResolver } from "./presentation/event.resolver";

@Module({
  imports: [CqrsModule],
  providers: [
    // Command handlers
    CreateEventHandler,
    UpdateEventHandler,
    DeleteEventHandler,
    // Query handlers (inject TenantConnectionRegistry + ClsService directly — no repositories)
    GetEventsHandler,
    GetOccurrencesHandler,
    // Resolver
    EventResolver,
    // Mappers
    EventMapper,
    OccurrenceMapper,
    // Typed buses
    TypedCommandBus,
    TypedQueryBus,
    // Repository tokens (used by command handlers only)
    { provide: EVENT_REPOSITORY, useClass: MongooseEventRepository },
    { provide: OCCURRENCE_REPOSITORY, useClass: MongooseOccurrenceRepository },
  ],
  exports: [EVENT_REPOSITORY, OCCURRENCE_REPOSITORY],
})
export class EventModule {}

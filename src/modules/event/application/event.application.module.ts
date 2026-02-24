import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { DateProviderModule } from "src/shared/date/date-provider.module";
import { TypedCommandBus } from "../../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../../shared/cqrs/typed-query-bus";
import { EVENT_TOKENS } from "../event.tokens";
import { EventMapper } from "../infrastructure/event/event.mapper";
import { MongooseEventRepository } from "../infrastructure/event/mongoose-event.repository";
import { MongooseOccurrenceRepository } from "../infrastructure/occurrence/mongoose-occurrence.repository";
import { OccurrenceMapper } from "../infrastructure/occurrence/occurrence.mapper";
import { CreateEventHandler } from "./commands/create-event/create-event.command";
import { DeleteEventHandler } from "./commands/delete-event/delete-event.command";
import { UpdateEventHandler } from "./commands/update-event/update-event.command";
import { InvalidateCacheWhenEventCreatedHandler } from "./event-handlers/invalidate-cache-when-event-created.event-handler";
import { InvalidateCacheWhenEventDeletedHandler } from "./event-handlers/invalidate-cache-when-event-deleted.event-handler";
import { InvalidateCacheWhenEventUpdatedHandler } from "./event-handlers/invalidate-cache-when-event-updated.event-handler";
import { GetEventsHandler } from "./queries/get-events/get-events.query";
import { GetOccurrencesHandler } from "./queries/get-occurrences/get-occurrences.query";

export const commandHandlers = [CreateEventHandler, UpdateEventHandler, DeleteEventHandler];
export const queryHandlers = [GetEventsHandler, GetOccurrencesHandler];
export const eventHandlers = [
  InvalidateCacheWhenEventCreatedHandler,
  InvalidateCacheWhenEventUpdatedHandler,
  InvalidateCacheWhenEventDeletedHandler,
];

@Module({
  imports: [DateProviderModule, CqrsModule],
  providers: [
    // Mappers
    EventMapper,
    OccurrenceMapper,
    // Typed buses
    TypedCommandBus,
    TypedQueryBus,
    // Repository tokens (used by command handlers only)
    { provide: EVENT_TOKENS.EVENT_REPOSITORY, useClass: MongooseEventRepository },
    { provide: EVENT_TOKENS.OCCURRENCE_REPOSITORY, useClass: MongooseOccurrenceRepository },
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
  ],
  exports: [...commandHandlers, ...queryHandlers, ...eventHandlers],
})
export class EventApplicationModule {}

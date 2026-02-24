import { Module } from "@nestjs/common";
import { IEventModuleInProc } from "../../../shared/in-proc/event-module.in-proc";
import { EVENT_TOKENS } from "../event.tokens";
import { EventMapper } from "../infrastructure/event/event.mapper";
import { MongooseEventRepository } from "../infrastructure/event/mongoose-event.repository";
import { MongooseOccurrenceRepository } from "../infrastructure/occurrence/mongoose-occurrence.repository";
import { OccurrenceMapper } from "../infrastructure/occurrence/occurrence.mapper";
import { EventModuleInProcImpl } from "../presentation/in-proc/event-module.in-proc.impl";
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
  providers: [
    // Mappers
    EventMapper,
    OccurrenceMapper,
    // Repository tokens (used by command handlers only)
    { provide: EVENT_TOKENS.EVENT_REPOSITORY, useClass: MongooseEventRepository },
    { provide: EVENT_TOKENS.OCCURRENCE_REPOSITORY, useClass: MongooseOccurrenceRepository },
    // In-proc facade (cross-module access)
    { provide: IEventModuleInProc, useClass: EventModuleInProcImpl },
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
  ],
  exports: [IEventModuleInProc, ...commandHandlers, ...queryHandlers, ...eventHandlers],
})
export class EventApplicationModule {}

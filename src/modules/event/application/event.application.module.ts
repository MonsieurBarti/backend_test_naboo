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

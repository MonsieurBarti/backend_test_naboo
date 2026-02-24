import { CancelRegistrationHandler } from "./commands/cancel-registration/cancel-registration.command";
import { RegisterForOccurrenceHandler } from "./commands/register-for-occurrence/register-for-occurrence.command";
import { InvalidateCacheWhenRegistrationCancelledHandler } from "./event-handlers/invalidate-cache-when-registration-cancelled.event-handler";
import { InvalidateCacheWhenRegistrationCreatedHandler } from "./event-handlers/invalidate-cache-when-registration-created.event-handler";
import { GetRegistrationsHandler } from "./queries/get-registrations/get-registrations.query";

export const commandHandlers = [RegisterForOccurrenceHandler, CancelRegistrationHandler];
export const queryHandlers = [GetRegistrationsHandler];
export const eventHandlers = [
  InvalidateCacheWhenRegistrationCreatedHandler,
  InvalidateCacheWhenRegistrationCancelledHandler,
];

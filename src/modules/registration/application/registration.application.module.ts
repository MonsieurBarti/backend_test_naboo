import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { EventModule } from "src/modules/event/event.module";
import { TypedCommandBus } from "src/shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "src/shared/cqrs/typed-query-bus";
import { DateProviderModule } from "src/shared/date/date-provider.module";
import { MongooseRegistrationRepository } from "../infrastructure/registration/mongoose-registration.repository";
import { RegistrationMapper } from "../infrastructure/registration/registration.mapper";
import { RegistrationSchema } from "../infrastructure/registration/registration.schema";
import { REGISTRATION_TOKENS } from "../registration.tokens";
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

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: "Registration", schema: RegistrationSchema }]),
    EventModule,
    DateProviderModule,
  ],
  providers: [
    // Mappers
    RegistrationMapper,
    // Typed buses
    TypedCommandBus,
    TypedQueryBus,
    // Repository token
    {
      provide: REGISTRATION_TOKENS.REGISTRATION_REPOSITORY,
      useClass: MongooseRegistrationRepository,
    },
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
  ],
  exports: [...commandHandlers, ...queryHandlers, ...eventHandlers],
})
export class RegistrationApplicationModule {}

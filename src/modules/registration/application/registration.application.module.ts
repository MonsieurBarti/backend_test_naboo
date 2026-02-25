import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { EventModule } from "src/modules/event/event.module";
import { IEventModuleInProc } from "src/shared/in-proc/event-module.in-proc";
import { MongooseRegistrationRepository } from "../infrastructure/registration/mongoose-registration.repository";
import { RegistrationMapper } from "../infrastructure/registration/registration.mapper";
import { RegistrationSchema } from "../infrastructure/registration/registration.schema";
import { REGISTRATION_TOKENS } from "../registration.tokens";
import { CancelRegistrationHandler } from "./commands/cancel-registration/cancel-registration.command";
import { RegisterForOccurrenceHandler } from "./commands/register-for-occurrence/register-for-occurrence.command";
import { InvalidateCacheWhenRegistrationCancelledHandler } from "./event-handlers/invalidate-cache-when-registration-cancelled.event-handler";
import { InvalidateCacheWhenRegistrationCreatedHandler } from "./event-handlers/invalidate-cache-when-registration-created.event-handler";
import { InvalidateCacheWhenRegistrationReactivatedHandler } from "./event-handlers/invalidate-cache-when-registration-reactivated.event-handler";
import { GetRegistrationsHandler } from "./queries/get-registrations/get-registrations.query";

export const commandHandlers = [RegisterForOccurrenceHandler, CancelRegistrationHandler];
export const queryHandlers = [GetRegistrationsHandler];
export const eventHandlers = [
  InvalidateCacheWhenRegistrationCreatedHandler,
  InvalidateCacheWhenRegistrationCancelledHandler,
  InvalidateCacheWhenRegistrationReactivatedHandler,
];

@Module({
  imports: [
    MongooseModule.forFeature([{ name: "Registration", schema: RegistrationSchema }]),
    EventModule,
  ],
  providers: [
    // Mappers
    RegistrationMapper,
    // Repository token
    {
      provide: REGISTRATION_TOKENS.REGISTRATION_REPOSITORY,
      useClass: MongooseRegistrationRepository,
    },
    // Cross-module facade (wired from EventModule's export)
    {
      provide: REGISTRATION_TOKENS.EVENT_MODULE_IN_PROC,
      useExisting: IEventModuleInProc,
    },
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
  ],
  exports: [...commandHandlers, ...queryHandlers, ...eventHandlers],
})
export class RegistrationApplicationModule {}

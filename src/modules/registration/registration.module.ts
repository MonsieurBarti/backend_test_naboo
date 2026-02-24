import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { TypedCommandBus } from "../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../shared/cqrs/typed-query-bus";
import { EventModule } from "../event/event.module";
import { CancelRegistrationHandler } from "./application/commands/cancel-registration/cancel-registration.command";
import { RegisterForOccurrenceHandler } from "./application/commands/register-for-occurrence/register-for-occurrence.command";
import { GetRegistrationsHandler } from "./application/queries/get-registrations/get-registrations.query";
import { MongooseRegistrationRepository } from "./infrastructure/registration/mongoose-registration.repository";
import { RegistrationMapper } from "./infrastructure/registration/registration.mapper";
import { RegistrationSchema } from "./infrastructure/registration/registration.schema";
import { RegistrationResolver } from "./presentation/registration.resolver";
import { REGISTRATION_REPOSITORY } from "./registration.tokens";

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: "Registration", schema: RegistrationSchema }]),
    EventModule,
  ],
  providers: [
    // Command handlers
    RegisterForOccurrenceHandler,
    CancelRegistrationHandler,
    // Query handlers
    GetRegistrationsHandler,
    // Resolver
    RegistrationResolver,
    // Mappers
    RegistrationMapper,
    // Typed buses
    TypedCommandBus,
    TypedQueryBus,
    // Repository token (used by command handlers)
    { provide: REGISTRATION_REPOSITORY, useClass: MongooseRegistrationRepository },
  ],
})
export class RegistrationModule {}

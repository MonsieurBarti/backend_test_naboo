import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { TypedCommandBus } from "../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../shared/cqrs/typed-query-bus";
import { DateProviderModule } from "../../shared/date/date-provider.module";
import { EventModule } from "../event/event.module";
import {
  commandHandlers,
  eventHandlers,
  queryHandlers,
} from "./application/registration.application.module";
import { MongooseRegistrationRepository } from "./infrastructure/registration/mongoose-registration.repository";
import { RegistrationMapper } from "./infrastructure/registration/registration.mapper";
import { RegistrationSchema } from "./infrastructure/registration/registration.schema";
import { RegistrationResolver } from "./presentation/registration.resolver";
import { REGISTRATION_TOKENS } from "./registration.tokens";

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: "Registration", schema: RegistrationSchema }]),
    EventModule,
    DateProviderModule,
  ],
  providers: [
    // Command, query, and event handlers (from application barrel)
    ...commandHandlers,
    ...queryHandlers,
    ...eventHandlers,
    // Resolver
    RegistrationResolver,
    // Mappers
    RegistrationMapper,
    // Typed buses
    TypedCommandBus,
    TypedQueryBus,
    // Repository token (used by command handlers)
    {
      provide: REGISTRATION_TOKENS.REGISTRATION_REPOSITORY,
      useClass: MongooseRegistrationRepository,
    },
  ],
})
export class RegistrationModule {}

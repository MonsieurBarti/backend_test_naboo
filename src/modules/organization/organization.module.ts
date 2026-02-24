import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { DateProviderModule } from "src/shared/date/date-provider.module";
import { TypedCommandBus } from "../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../shared/cqrs/typed-query-bus";
import { commandHandlers, queryHandlers } from "./application/organization.application.module";
import { MongooseOrganizationRepository } from "./infrastructure/organization/mongoose-organization.repository";
import { OrganizationMapper } from "./infrastructure/organization/organization.mapper";
import { OrganizationSchema } from "./infrastructure/organization/organization.schema";
import { ORGANIZATION_TOKENS } from "./organization.tokens";
import { OrganizationResolver } from "./presentation/organization.resolver";

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: "Organization", schema: OrganizationSchema }]),
    DateProviderModule,
  ],
  providers: [
    // Command and query handlers (from application barrel)
    ...commandHandlers,
    ...queryHandlers,
    // Resolver
    OrganizationResolver,
    // Mappers
    OrganizationMapper,
    // Typed buses
    TypedCommandBus,
    TypedQueryBus,
    // Repository token
    {
      provide: ORGANIZATION_TOKENS.ORGANIZATION_REPOSITORY,
      useClass: MongooseOrganizationRepository,
    },
  ],
})
export class OrganizationModule {}

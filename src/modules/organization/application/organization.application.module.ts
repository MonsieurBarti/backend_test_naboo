import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { TypedCommandBus } from "src/shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "src/shared/cqrs/typed-query-bus";
import { DateProviderModule } from "src/shared/date/date-provider.module";
import { MongooseOrganizationRepository } from "../infrastructure/organization/mongoose-organization.repository";
import { OrganizationMapper } from "../infrastructure/organization/organization.mapper";
import { OrganizationSchema } from "../infrastructure/organization/organization.schema";
import { ORGANIZATION_TOKENS } from "../organization.tokens";
import { CreateOrganizationHandler } from "./commands/create-organization/create-organization.command";
import { GetOrganizationHandler } from "./queries/get-organization/get-organization.query";

export const commandHandlers = [CreateOrganizationHandler];
export const queryHandlers = [GetOrganizationHandler];

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: "Organization", schema: OrganizationSchema }]),
    DateProviderModule,
  ],
  providers: [
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
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [...commandHandlers, ...queryHandlers],
})
export class OrganizationApplicationModule {}

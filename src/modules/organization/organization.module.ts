import { Module } from "@nestjs/common";
import { CqrsModule } from "@nestjs/cqrs";
import { MongooseModule } from "@nestjs/mongoose";
import { TypedCommandBus } from "../../shared/cqrs/typed-command-bus";
import { TypedQueryBus } from "../../shared/cqrs/typed-query-bus";
import { CreateOrganizationHandler } from "./application/commands/create-organization/create-organization.command";
import { GetOrganizationHandler } from "./application/queries/get-organization/get-organization.query";
import { MongooseOrganizationRepository } from "./infrastructure/organization/mongoose-organization.repository";
import { OrganizationMapper } from "./infrastructure/organization/organization.mapper";
import { OrganizationSchema } from "./infrastructure/organization/organization.schema";
import { ORGANIZATION_REPOSITORY } from "./organization.tokens";
import { OrganizationResolver } from "./presentation/organization.resolver";

@Module({
  imports: [
    CqrsModule,
    MongooseModule.forFeature([{ name: "Organization", schema: OrganizationSchema }]),
  ],
  providers: [
    CreateOrganizationHandler,
    GetOrganizationHandler,
    OrganizationResolver,
    OrganizationMapper,
    TypedCommandBus,
    TypedQueryBus,
    {
      provide: ORGANIZATION_REPOSITORY,
      useClass: MongooseOrganizationRepository,
    },
  ],
  exports: [ORGANIZATION_REPOSITORY],
})
export class OrganizationModule {}

import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { IOrganizationModuleInProc } from "../../../shared/in-proc/organization-module.in-proc";
import { MongooseOrganizationRepository } from "../infrastructure/organization/mongoose-organization.repository";
import { OrganizationMapper } from "../infrastructure/organization/organization.mapper";
import { OrganizationSchema } from "../infrastructure/organization/organization.schema";
import { ORGANIZATION_TOKENS } from "../organization.tokens";
import { OrganizationModuleInProcImpl } from "../presentation/in-proc/organization-module.in-proc.impl";
import { CreateOrganizationHandler } from "./commands/create-organization/create-organization.command";
import { GetOrganizationHandler } from "./queries/get-organization/get-organization.query";

export const commandHandlers = [CreateOrganizationHandler];
export const queryHandlers = [GetOrganizationHandler];

@Module({
  imports: [MongooseModule.forFeature([{ name: "Organization", schema: OrganizationSchema }])],
  providers: [
    // Mappers
    OrganizationMapper,
    // Repository token
    {
      provide: ORGANIZATION_TOKENS.ORGANIZATION_REPOSITORY,
      useClass: MongooseOrganizationRepository,
    },
    // In-proc facade (cross-module access)
    { provide: IOrganizationModuleInProc, useClass: OrganizationModuleInProcImpl },
    ...commandHandlers,
    ...queryHandlers,
  ],
  exports: [IOrganizationModuleInProc, ...commandHandlers, ...queryHandlers],
})
export class OrganizationApplicationModule {}

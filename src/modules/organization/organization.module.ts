import { Module } from "@nestjs/common";
import { OrganizationApplicationModule } from "./application/organization.application.module";
import { OrganizationResolver } from "./presentation/organization.resolver";

@Module({
  imports: [OrganizationApplicationModule],
  providers: [OrganizationResolver],
  exports: [OrganizationApplicationModule],
})
export class OrganizationModule {}

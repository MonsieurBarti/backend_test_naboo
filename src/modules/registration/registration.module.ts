import { Module } from "@nestjs/common";
import { RegistrationApplicationModule } from "./application/registration.application.module";
import { RegistrationResolver } from "./presentation/registration.resolver";

@Module({
  imports: [RegistrationApplicationModule],
  providers: [RegistrationResolver],
  exports: [RegistrationApplicationModule],
})
export class RegistrationModule {}

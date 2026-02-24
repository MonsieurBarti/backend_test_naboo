import { Module } from "@nestjs/common";
import { EventApplicationModule } from "./application/event.application.module";
import { EventResolver } from "./presentation/event.resolver";

@Module({
  imports: [EventApplicationModule],
  providers: [EventResolver],
  exports: [EventApplicationModule],
})
export class EventModule {}

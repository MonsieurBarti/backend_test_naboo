import { Module } from "@nestjs/common";
import { IDateProvider } from "./date-provider";
import { DateProvider } from "./date-provider.impl";

@Module({
  providers: [
    {
      provide: IDateProvider,
      useClass: DateProvider,
    },
  ],
  exports: [
    {
      provide: IDateProvider,
      useClass: DateProvider,
    },
  ],
})
export class DateProviderModule {}

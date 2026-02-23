import { Injectable } from "@nestjs/common";
import { IDateProvider } from "./date-provider";

@Injectable()
export class DateProvider extends IDateProvider {
  now(): Date {
    return new Date();
  }
}

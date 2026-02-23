import { IDateProvider } from "../date/date-provider";

export class FakeDateProvider extends IDateProvider {
  private currentDate: Date;

  constructor(fixedDate?: Date) {
    super();
    this.currentDate = fixedDate ?? new Date("2024-01-15T10:00:00.000Z");
  }

  now(): Date {
    return this.currentDate;
  }

  setCurrentDate(date: Date): void {
    this.currentDate = date;
  }

  advanceBy(ms: number): void {
    this.currentDate = new Date(this.currentDate.getTime() + ms);
  }
}

import { z } from "zod";

export const frequencySchema = z.enum(["DAILY", "WEEKLY", "MONTHLY", "YEARLY"]);
export type Frequency = z.infer<typeof frequencySchema>;

export const dayOfWeekSchema = z.enum(["MO", "TU", "WE", "TH", "FR", "SA", "SU"]);
export type DayOfWeek = z.infer<typeof dayOfWeekSchema>;

export const recurrencePatternSchema = z.object({
  frequency: frequencySchema,
  interval: z.number().int().positive().nullish(),
  byDay: z.array(dayOfWeekSchema).nullish(),
  byMonthDay: z.array(z.number().int().min(1).max(31)).nullish(),
  byMonth: z.array(z.number().int().min(1).max(12)).nullish(),
  until: z.date().nullish(),
  count: z.number().int().positive().nullish(),
});

export type RecurrencePatternProps = z.infer<typeof recurrencePatternSchema>;

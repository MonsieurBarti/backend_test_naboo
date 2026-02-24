import { RRule } from "rrule";
import type { RecurrencePatternProps } from "../../domain/event/recurrence-pattern";

export const MAX_OCCURRENCES = 183;

type FreqKey = "DAILY" | "WEEKLY" | "MONTHLY" | "YEARLY";
const FREQ_MAP = {
  DAILY: RRule.DAILY,
  WEEKLY: RRule.WEEKLY,
  MONTHLY: RRule.MONTHLY,
  YEARLY: RRule.YEARLY,
} satisfies Record<FreqKey, number>;

type DayKey = "MO" | "TU" | "WE" | "TH" | "FR" | "SA" | "SU";
const DAY_MAP = {
  MO: RRule.MO,
  TU: RRule.TU,
  WE: RRule.WE,
  TH: RRule.TH,
  FR: RRule.FR,
  SA: RRule.SA,
  SU: RRule.SU,
} satisfies Record<DayKey, unknown>;

export function materializeOccurrenceDates(pattern: RecurrencePatternProps, dtstart: Date): Date[] {
  const rule = new RRule({
    freq: FREQ_MAP[pattern.frequency],
    interval: pattern.interval ?? 1,
    byweekday: pattern.byDay?.map((d) => DAY_MAP[d]),
    bymonthday: pattern.byMonthDay ?? undefined,
    bymonth: pattern.byMonth ?? undefined,
    dtstart,
    until: pattern.until ?? undefined,
    count: pattern.count,
  });

  // Always cap at MAX_OCCURRENCES — defense in depth against infinite rules
  return rule.all((_, i) => i < MAX_OCCURRENCES);
}

import { AppSettings, Period, PERIODS } from "@/types/yatta";

const pad = (value: number) => String(value).padStart(2, "0");

export const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

const minutesOfDay = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return (hours || 0) * 60 + (minutes || 0);
};

export const getCompletionDateKey = (settings: AppSettings, now = new Date()) => {
  const current = now.getHours() * 60 + now.getMinutes();
  const reset = minutesOfDay(settings.resetTime);
  const effectiveDate = new Date(now);
  if (current < reset) {
    effectiveDate.setDate(effectiveDate.getDate() - 1);
  }
  return toDateKey(effectiveDate);
};

export const getCurrentPeriod = (settings: AppSettings, now = new Date()): Period => {
  const current = now.getHours() * 60 + now.getMinutes();
  const starts = PERIODS.map((period) => ({
    period,
    minutes: minutesOfDay(settings.periodStartTimes[period]),
  })).sort((a, b) => a.minutes - b.minutes);

  let active = starts[starts.length - 1].period;
  for (const start of starts) {
    if (current >= start.minutes) {
      active = start.period;
    }
  }
  return active;
};

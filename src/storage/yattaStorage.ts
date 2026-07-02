import { getCompletionDateKey } from "@/lib/date";
import { normalizeThemeColor } from "@/lib/theme";
import { keyValueStore } from "@/storage/keyValueStore";
import {
  CompletionState,
  DAY_ORDER,
  Period,
  PERIODS,
  Task,
  TaskSchedule,
  YattaData,
} from "@/types/yatta";
import { defaultSettings, defaultTasks } from "@/storage/defaults";

const STORAGE_KEY = "yatta:v1";

const freshCompletion = (date: string): CompletionState => ({
  date,
  completedTaskIds: [],
});

const uniqueDays = (days: number[] = []) =>
  DAY_ORDER.filter((day) => days.includes(day));

const normalizePeriods = (periods: Period[] = []) =>
  PERIODS.filter((period) => periods.includes(period));

const normalizeTask = (task: Task): Task => {
  const fallbackDays = uniqueDays(task.days);
  const fallbackPeriods = normalizePeriods(task.periods);
  const schedule: TaskSchedule = {
    morning: uniqueDays(
      task.schedule?.morning ??
        (fallbackPeriods.includes("morning") ? fallbackDays : []),
    ),
    daytime: uniqueDays(
      task.schedule?.daytime ??
        (fallbackPeriods.includes("daytime") ? fallbackDays : []),
    ),
    night: uniqueDays(
      task.schedule?.night ??
        (fallbackPeriods.includes("night") ? fallbackDays : []),
    ),
  };
  const days = uniqueDays(PERIODS.flatMap((period) => schedule[period]));
  const periods = PERIODS.filter((period) => schedule[period].length > 0);
  return {
    ...task,
    days,
    periods,
    schedule,
  };
};

export const loadYattaData = async (): Promise<YattaData> => {
  const fallbackDate = getCompletionDateKey(defaultSettings);
  const fallback: YattaData = {
    tasks: defaultTasks,
    settings: defaultSettings,
    completion: freshCompletion(fallbackDate),
  };

  const raw = await keyValueStore.getItem(STORAGE_KEY);
  if (!raw) {
    await saveYattaData(fallback);
    return fallback;
  }

  try {
    const parsed = JSON.parse(raw) as Partial<YattaData>;
    const settings = {
      ...defaultSettings,
      ...parsed.settings,
      themeColor: normalizeThemeColor(parsed.settings?.themeColor),
    };
    const today = getCompletionDateKey(settings);
    const storedCompletion = parsed.completion;
    return {
      tasks: parsed.tasks?.length ? parsed.tasks.map(normalizeTask) : defaultTasks,
      settings,
      completion:
        storedCompletion?.date === today ? storedCompletion : freshCompletion(today),
    };
  } catch {
    await saveYattaData(fallback);
    return fallback;
  }
};

export const saveYattaData = async (data: YattaData) => {
  await keyValueStore.setItem(STORAGE_KEY, JSON.stringify(data));
};

export type Period = "morning" | "daytime" | "night";
export type ThemeColor = "blue" | "black" | "pink" | "purple";

export type Task = {
  id: string;
  title: string;
  days: number[];
  periods: Period[];
  order: number;
};

export type CompletionState = {
  date: string;
  completedTaskIds: string[];
};

export type AppSettings = {
  resetTime: string;
  periodStartTimes: Record<Period, string>;
  themeColor: ThemeColor;
};

export type YattaData = {
  tasks: Task[];
  settings: AppSettings;
  completion: CompletionState;
};

export type Theme = {
  primary: string;
  text: string;
  background: string;
  softText: string;
};

export const PERIODS: Period[] = ["morning", "daytime", "night"];

export const PERIOD_LABELS: Record<Period, string> = {
  morning: "あさ",
  daytime: "ひる",
  night: "よる",
};

export const PERIOD_SETTING_LABELS: Record<Period, string> = {
  morning: "朝",
  daytime: "昼",
  night: "夜",
};

export const DAY_LABELS = ["日", "月", "火", "水", "木", "金", "土"];
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

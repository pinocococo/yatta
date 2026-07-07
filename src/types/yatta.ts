export type Period = "morning" | "daytime" | "night";
export type ThemeColor = "blue" | "blackYellow";
export type TaskSchedule = Record<Period, number[]>;

export type Task = {
  id: string;
  title: string;
  days: number[];
  periods: Period[];
  schedule?: TaskSchedule;
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
  funCompletions: boolean;
};

export type YattaData = {
  tasks: Task[];
  settings: AppSettings;
  completion: CompletionState;
};

export type Theme = {
  variant: ThemeColor;
  primary: string;
  text: string;
  background: string;
  softText: string;
  headerBackground: string;
  headerText: string;
  resetBandBackground: string;
  resetText: string;
  counterBackground: string;
  counterText: string;
  tabActiveBackground: string;
  tabInactiveBackground: string;
  tabActiveText: string;
  tabInactiveText: string;
  tabBadgeBackground: string;
  tabBadgeText: string;
  cardBackground: string;
  cardText: string;
  settingsBackground: string;
  settingsPanelBackground: string;
  itemCardBackground: string;
  chipActiveText: string;
  chipInactiveBackground: string;
  chipInactiveBorder: string;
  addButtonBackground: string;
  addButtonIcon: string;
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
export const DAY_ORDER = [0, 1, 2, 3, 4, 5, 6];

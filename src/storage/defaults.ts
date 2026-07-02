import { AppSettings, Task } from "@/types/yatta";

const schedule = (days: number[], periods: Task["periods"]) => ({
  morning: periods.includes("morning") ? days : [],
  daytime: periods.includes("daytime") ? days : [],
  night: periods.includes("night") ? days : [],
});

export const defaultSettings: AppSettings = {
  resetTime: "07:00",
  periodStartTimes: {
    morning: "04:00",
    daytime: "11:00",
    night: "17:00",
  },
  themeColor: "blue",
  funCompletions: true,
};

export const defaultTasks: Task[] = [
  {
    id: "wash-face",
    title: "顔を洗う",
    days: [1, 2, 3, 4, 5, 6, 0],
    periods: ["morning"],
    schedule: schedule([1, 2, 3, 4, 5, 6, 0], ["morning"]),
    order: 1,
  },
  {
    id: "brush-teeth",
    title: "歯をみがく",
    days: [1, 2, 3, 4, 5, 6, 0],
    periods: ["morning", "night"],
    schedule: schedule([1, 2, 3, 4, 5, 6, 0], ["morning", "night"]),
    order: 2,
  },
  {
    id: "swimming",
    title: "スイミングの用意",
    days: [4],
    periods: ["morning"],
    schedule: schedule([4], ["morning"]),
    order: 3,
  },
  {
    id: "bottle",
    title: "水筒",
    days: [1, 2, 3, 4, 5],
    periods: ["morning"],
    schedule: schedule([1, 2, 3, 4, 5], ["morning"]),
    order: 4,
  },
  {
    id: "hat",
    title: "帽子",
    days: [1, 2, 3, 4, 5],
    periods: ["morning"],
    schedule: schedule([1, 2, 3, 4, 5], ["morning"]),
    order: 5,
  },
];

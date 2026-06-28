import { AppSettings, Task } from "@/types/yatta";

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
    order: 1,
  },
  {
    id: "brush-teeth",
    title: "歯をみがく",
    days: [1, 2, 3, 4, 5, 6, 0],
    periods: ["morning", "night"],
    order: 2,
  },
  {
    id: "swimming",
    title: "スイミングの用意",
    days: [4],
    periods: ["morning"],
    order: 3,
  },
  {
    id: "bottle",
    title: "水筒",
    days: [1, 2, 3, 4, 5],
    periods: ["morning"],
    order: 4,
  },
  {
    id: "hat",
    title: "帽子",
    days: [1, 2, 3, 4, 5],
    periods: ["morning"],
    order: 5,
  },
];

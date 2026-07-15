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
  themeColor: "blackYellow",
  funCompletions: true,
};

const everyDay = [0, 1, 2, 3, 4, 5, 6];
const weekdays = [1, 2, 3, 4, 5];
const sundayToThursday = [0, 1, 2, 3, 4];
const sundayNightMondayMorning = () => ({
  morning: [1],
  daytime: [],
  night: [0],
});

export const defaultTasks: Task[] = [
  {
    id: "wash-face",
    title: "かおをあらう",
    days: everyDay,
    periods: ["morning"],
    schedule: schedule(everyDay, ["morning"]),
    order: 1,
  },
  {
    id: "brush-teeth",
    title: "はをみがく",
    days: everyDay,
    periods: ["morning", "night"],
    schedule: schedule(everyDay, ["morning", "night"]),
    order: 2,
  },
  {
    id: "bottle",
    title: "水とう",
    days: weekdays,
    periods: ["morning"],
    schedule: schedule(weekdays, ["morning"]),
    order: 3,
  },
  {
    id: "pencil-case",
    title: "ふでばこ",
    days: weekdays,
    periods: ["morning"],
    schedule: schedule(weekdays, ["morning"]),
    order: 4,
  },
  {
    id: "pencil-eraser",
    title: "えんぴつとけしごむ",
    days: sundayToThursday,
    periods: ["night"],
    schedule: schedule(sundayToThursday, ["night"]),
    order: 5,
  },
  {
    id: "homework",
    title: "しゅくだい",
    days: [0, 1, 2, 3, 4, 5],
    periods: ["morning", "night"],
    schedule: {
      morning: weekdays,
      daytime: [],
      night: sundayToThursday,
    },
    order: 6,
  },
  {
    id: "indoor-shoes",
    title: "うわばき",
    days: [0, 1],
    periods: ["morning", "night"],
    schedule: sundayNightMondayMorning(),
    order: 7,
  },
  {
    id: "red-white-hat",
    title: "赤白ぼうし",
    days: [0, 1],
    periods: ["morning", "night"],
    schedule: sundayNightMondayMorning(),
    order: 8,
  },
];

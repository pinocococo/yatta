import { Ionicons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import { StatusBar } from "expo-status-bar";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Animated, { LinearTransition, ReduceMotion } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";

import { SegmentTabs } from "@/components/SegmentTabs";
import { TaskCard } from "@/components/TaskCard";
import { getCompletionDateKey, getCurrentPeriod } from "@/lib/date";
import { buildTheme, THEME_COLORS } from "@/lib/theme";
import { defaultSettings } from "@/storage/defaults";
import { loadYattaData, saveYattaData } from "@/storage/yattaStorage";
import {
  AppSettings,
  CompletionState,
  DAY_LABELS,
  DAY_ORDER,
  Period,
  PERIOD_LABELS,
  PERIOD_SETTING_LABELS,
  PERIODS,
  Task,
  TaskSchedule,
  ThemeColor,
  YattaData,
} from "@/types/yatta";

type Screen = "tasks" | "settings";
type SettingsTab = "basic" | "items";

const blueWaveImage = require("../assets/wave-blue.png");
const completeLogoBlueImage = require("../assets/yatta-complete-blue.png");
const completeLogoYellowImage = require("../assets/yatta-complete-yellow.png");
const allCompleteSound = require("../assets/audio/all-complete.mp3");

const reorderLayoutTransition = LinearTransition.duration(180).reduceMotion(
  ReduceMotion.Never,
);

const byOrder = (a: Task, b: Task) => a.order - b.order;

const completionKey = (period: Period, taskId: string) => `${period}:${taskId}`;

const getTasksFor = (
  tasks: Task[],
  completion: CompletionState,
  period: Period,
) => {
  const day = new Date(`${completion.date}T12:00:00`).getDay();
  return tasks
    .filter(
      (task) =>
        isTaskScheduledFor(task, day, period) &&
        !completion.completedTaskIds.includes(completionKey(period, task.id)),
    )
    .sort(byOrder);
};

const getDayForCompletion = (completion: CompletionState) =>
  new Date(`${completion.date}T12:00:00`).getDay();

const uniqueDays = (days: number[]) => DAY_ORDER.filter((day) => days.includes(day));

const getTaskSchedule = (task: Task): TaskSchedule =>
  PERIODS.reduce(
    (acc, period) => ({
      ...acc,
      [period]: uniqueDays(
        task.schedule?.[period] ??
          (task.periods.includes(period) ? task.days : []),
      ),
    }),
    {} as TaskSchedule,
  );

const isTaskScheduledFor = (task: Task, day: number, period: Period) =>
  getTaskSchedule(task)[period].includes(day);

const getTaskDays = (schedule: TaskSchedule) =>
  uniqueDays(PERIODS.flatMap((period) => schedule[period]));

const getTaskPeriods = (schedule: TaskSchedule) =>
  PERIODS.filter((period) => schedule[period].length > 0);

const getPeriodsWithTasksForDay = (tasks: Task[], completion: CompletionState) => {
  const day = getDayForCompletion(completion);
  return PERIODS.filter((period) =>
    tasks.some((task) => isTaskScheduledFor(task, day, period)),
  );
};

const normalizeTime = (value: string) =>
  value
    .replace(/[^\d:]/g, "")
    .replace(/^(\d{2})(\d)/, "$1:$2")
    .slice(0, 5);

const formatDatePart = (value: number) => String(value);

const formatClockTime = (date: Date) =>
  `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;

const playAllCompleteSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(allCompleteSound, {
      shouldPlay: true,
      volume: 1,
    });
    sound.setOnPlaybackStatusUpdate((status) => {
      if (status.isLoaded && status.didJustFinish) {
        void sound.unloadAsync();
      }
    });
  } catch {
    // Completion display should still work if the sound cannot be played.
  }
};

export default function YattaApp() {
  const [data, setData] = useState<YattaData | null>(null);
  const [screen, setScreen] = useState<Screen>("tasks");
  const [period, setPeriod] = useState<Period>("morning");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("basic");
  const screenRef = useRef(screen);
  const currentClockPeriodRef = useRef<Period | null>(null);

  const setPeriodToCurrentTime = (currentData: YattaData) => {
    const activePeriod = getCurrentPeriod(currentData.settings);
    const availablePeriods = getPeriodsWithTasksForDay(
      currentData.tasks,
      currentData.completion,
    );
    if (availablePeriods.length > 0) {
      setPeriod(availablePeriods.includes(activePeriod) ? activePeriod : availablePeriods[0]);
    } else {
      setPeriod(activePeriod);
    }
    currentClockPeriodRef.current = activePeriod;
  };

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    loadYattaData().then((loaded) => {
      setData(loaded);
      setPeriodToCurrentTime(loaded);
    });
  }, []);

  const theme = useMemo(
    () => buildTheme(data?.settings.themeColor ?? defaultSettings.themeColor),
    [data?.settings.themeColor],
  );
  const visiblePeriods = useMemo(
    () => (data ? getPeriodsWithTasksForDay(data.tasks, data.completion) : PERIODS),
    [data],
  );

  useEffect(() => {
    if (data && visiblePeriods.length > 0 && !visiblePeriods.includes(period)) {
      setPeriod(visiblePeriods[0]);
    }
  }, [data, period, visiblePeriods]);

  const updateData = (recipe: (current: YattaData) => YattaData) => {
    setData((current) => {
      if (!current) {
        return current;
      }
      const next = recipe(current);
      saveYattaData(next);
      return next;
    });
  };

  const updateSettings = (settings: AppSettings) => {
    updateData((current) => {
      const expectedDate = getCompletionDateKey(settings);
      return {
        ...current,
        settings,
        completion:
          current.completion.date === expectedDate
            ? current.completion
            : { date: expectedDate, completedTaskIds: [] },
      };
    });
  };

  useEffect(() => {
    if (!data) {
      return;
    }
    const syncCompletionDate = () => {
      const expectedDate = getCompletionDateKey(data.settings);
      const nextData =
        data.completion.date === expectedDate
          ? data
          : {
              ...data,
              completion: { date: expectedDate, completedTaskIds: [] },
            };
      if (nextData !== data) {
        updateData(() => nextData);
      }
      const activePeriod = getCurrentPeriod(nextData.settings);
      if (activePeriod !== currentClockPeriodRef.current && screenRef.current === "tasks") {
        setPeriodToCurrentTime(nextData);
        return;
      }
      currentClockPeriodRef.current = activePeriod;
    };
    const intervalId = setInterval(syncCompletionDate, 60 * 1000);
    return () => clearInterval(intervalId);
  }, [data]);

  useEffect(() => {
    if (!data) {
      return;
    }
    const subscription = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        setPeriodToCurrentTime(data);
      }
    });
    return () => subscription.remove();
  }, [data]);

  if (!data) {
    return (
      <SafeAreaView style={[styles.loading, { backgroundColor: theme.background }]}>
        <ActivityIndicator color={theme.primary} />
      </SafeAreaView>
    );
  }

  const visibleTasks = getTasksFor(data.tasks, data.completion, period);
  const counts = PERIODS.reduce<Record<Period, number>>((acc, key) => {
    acc[key] = getTasksFor(data.tasks, data.completion, key).length;
    return acc;
  }, {} as Record<Period, number>);

  const completeTask = (taskId: string, completedPeriod: Period) => {
    updateData((current) => {
      const key = completionKey(completedPeriod, taskId);
      if (current.completion.completedTaskIds.includes(key)) {
        return current;
      }
      return {
        ...current,
        completion: {
          ...current.completion,
          completedTaskIds: [...current.completion.completedTaskIds, key],
        },
      };
    });
  };

  const resetCurrentPeriod = () => {
    const targetPrefix = `${period}:`;
    updateData((current) => ({
      ...current,
      completion: {
        ...current.completion,
        completedTaskIds: current.completion.completedTaskIds.filter(
          (id) => !id.startsWith(targetPrefix),
        ),
      },
    }));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.headerBackground }]}>
      <StatusBar style="light" />
      {screen === "tasks" ? (
        <TaskListScreen
          counts={counts}
          period={period}
          periods={visiblePeriods}
          setPeriod={setPeriod}
          tasks={visibleTasks}
          completionEffectsEnabled={data.settings.funCompletions}
          theme={theme}
          onComplete={completeTask}
          onOpenSettings={() => setScreen("settings")}
          onReset={resetCurrentPeriod}
        />
      ) : (
        <SettingsScreen
          data={data}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          theme={theme}
          onBack={() => {
            setPeriodToCurrentTime(data);
            setScreen("tasks");
          }}
          onUpdateSettings={updateSettings}
          onUpdateTasks={(tasks) =>
            updateData((current) => ({
              ...current,
              tasks,
              completion: {
                ...current.completion,
                completedTaskIds: current.completion.completedTaskIds.filter((id) =>
                  tasks.some(
                    (task) =>
                      task.id === id ||
                      PERIODS.some((period) => id === completionKey(period, task.id)),
                  ),
                ),
              },
            }))
          }
        />
      )}
    </SafeAreaView>
  );
}

function TaskListScreen({
  counts,
  period,
  periods,
  setPeriod,
  tasks,
  completionEffectsEnabled,
  theme,
  onComplete,
  onOpenSettings,
  onReset,
}: {
  counts: Record<Period, number>;
  period: Period;
  periods: Period[];
  setPeriod: (period: Period) => void;
  tasks: Task[];
  completionEffectsEnabled: boolean;
  theme: ReturnType<typeof buildTheme>;
  onComplete: (taskId: string, period: Period) => void;
  onOpenSettings: () => void;
  onReset: () => void;
}) {
  const { width } = useWindowDimensions();
  const [isTaskSwipeActive, setTaskSwipeActive] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const previousVisibleCountRef = useRef<{ period: Period; count: number } | null>(null);
  const isBlackYellow = theme.variant === "blackYellow";
  const isTablet = width >= 768;
  const isCompactHeader = width < 360;
  const completeLogoSource = isBlackYellow ? completeLogoYellowImage : completeLogoBlueImage;

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const previous = previousVisibleCountRef.current;
    if (
      completionEffectsEnabled &&
      previous?.period === period &&
      previous.count > 0 &&
      tasks.length === 0
    ) {
      void playAllCompleteSound();
    }
    previousVisibleCountRef.current = {
      period,
      count: tasks.length,
    };
  }, [completionEffectsEnabled, period, tasks.length]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.mainHeader,
          isTablet && styles.tabletMainHeader,
          isBlackYellow && !isTablet && styles.blackYellowContentWidth,
          { backgroundColor: theme.headerBackground },
        ]}
      >
        <Text
          style={[
            styles.appTitle,
            isBlackYellow && styles.blackYellowAppTitle,
            { color: theme.headerText },
          ]}
          adjustsFontSizeToFit
          minimumFontScale={0.9}
          numberOfLines={1}
        >
          <HeaderDateText
            date={now}
            isBlackYellow={isBlackYellow}
            isCompact={isCompactHeader}
            isTablet={isTablet}
          />
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="設定を開く"
          onPress={onOpenSettings}
          style={styles.iconButton}
        >
          <Ionicons
            name="settings-outline"
            size={isBlackYellow ? 36 : 31}
            color={theme.headerText}
            style={isBlackYellow && styles.blackYellowSettingsIcon}
          />
        </Pressable>
      </View>
      {periods.length > 0 ? (
        <SegmentTabs
          activeKey={period}
          onChange={setPeriod}
          tabletTextBoost
          tabs={periods.map((key) => ({
            key,
            label: PERIOD_LABELS[key],
            count: counts[key],
          }))}
          theme={theme}
        />
      ) : null}
      <View
        style={[
          styles.resetBand,
          isBlackYellow && styles.blackYellowResetBand,
          isTablet && styles.tabletResetBand,
          isBlackYellow && isTablet && styles.tabletBlackYellowResetBand,
          isBlackYellow && !isTablet && styles.blackYellowContentWidth,
          { backgroundColor: theme.resetBandBackground },
        ]}
      >
        <Pressable onPress={onReset} hitSlop={10} style={styles.resetButton}>
          <Ionicons name="refresh" size={24} color={theme.resetText} />
          <Text
            style={[
              styles.resetText,
              isTablet && styles.tabletResetText,
              { color: theme.resetText },
            ]}
          >
            リセットする
          </Text>
        </Pressable>
        {isBlackYellow ? (
          <View
            style={[
              styles.blackYellowRemaining,
              isTablet && styles.tabletBlackYellowRemaining,
            ]}
          >
            <View
              style={[
                styles.blackYellowRemainingWedge,
                isTablet && styles.tabletBlackYellowRemainingWedge,
              ]}
            />
            <View
              style={[
                styles.blackYellowRemainingBody,
                isTablet && styles.tabletBlackYellowRemainingBody,
                { backgroundColor: theme.counterBackground },
              ]}
            >
              <Text
                style={[
                  styles.remainingSmall,
                  isTablet && styles.tabletRemainingSmall,
                  { color: theme.counterText },
                ]}
              >
                のこり
              </Text>
              <Text
                style={[
                  styles.remainingBig,
                  isTablet && styles.tabletRemainingBig,
                  { color: theme.counterText },
                ]}
              >
                {counts[period]}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.remainingPill,
              isTablet && styles.tabletRemainingPill,
              { backgroundColor: theme.counterBackground },
            ]}
          >
            <Text
              style={[
                styles.remainingSmall,
                isTablet && styles.tabletRemainingSmall,
                { color: theme.counterText },
              ]}
            >
              のこり
            </Text>
            <Text
              style={[
                styles.remainingBig,
                isTablet && styles.tabletRemainingBig,
                { color: theme.counterText },
              ]}
            >
              {counts[period]}
            </Text>
          </View>
        )}
      </View>
      {isBlackYellow ? null : (
        <View
          style={[styles.wave, { backgroundColor: theme.background }]}
          pointerEvents="none"
        >
          <Image source={blueWaveImage} resizeMode="stretch" style={styles.waveImage} />
        </View>
      )}
      <ScrollView
        scrollEnabled={!isTaskSwipeActive}
        style={styles.taskScroll}
        contentContainerStyle={[
          styles.taskList,
          isTablet && styles.tabletTaskList,
          isBlackYellow && styles.blackYellowTaskList,
          isBlackYellow && !isTablet && styles.blackYellowContentWidth,
          { width },
        ]}
      >
        {tasks.map((task) => (
          <TaskCard
            key={completionKey(period, task.id)}
            task={task}
            period={period}
            theme={theme}
            isTablet={isTablet}
            completionEffectsEnabled={completionEffectsEnabled}
            onComplete={onComplete}
            onSwipeActiveChange={setTaskSwipeActive}
          />
        ))}
        {tasks.length === 0 ? (
          <View style={styles.empty}>
            <Image
              accessibilityIgnoresInvertColors
              resizeMode="contain"
              source={completeLogoSource}
              style={[styles.completeLogo, isTablet && styles.tabletCompleteLogo]}
            />
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function HeaderDateText({
  date,
  isBlackYellow,
  isCompact,
  isTablet,
}: {
  date: Date;
  isBlackYellow: boolean;
  isCompact: boolean;
  isTablet: boolean;
}) {
  const month = formatDatePart(date.getMonth() + 1);
  const day = formatDatePart(date.getDate());
  const dayLabel = DAY_LABELS[date.getDay()];
  const time = formatClockTime(date);
  const tabletBoost = isTablet ? 8 : 0;
  const largeSize = (isCompact ? 20 : isBlackYellow ? 22 : 24) + tabletBoost;
  const dateUnitSize = (isCompact ? 16 : 18) + tabletBoost;

  return (
    <>
      <Text style={[styles.headerLargeDatePart, { fontSize: largeSize }]}>{month}</Text>
      <Text style={[styles.headerDateUnit, { fontSize: dateUnitSize }]}>月</Text>
      <Text style={[styles.headerLargeDatePart, { fontSize: largeSize }]}>{day}</Text>
      <Text style={[styles.headerDateUnit, { fontSize: dateUnitSize }]}>
        日({dayLabel}){" "}
      </Text>
      <Text style={[styles.headerLargeDatePart, { fontSize: largeSize }]}>{time}</Text>
    </>
  );
}

function SettingsScreen({
  data,
  settingsTab,
  setSettingsTab,
  theme,
  onBack,
  onUpdateSettings,
  onUpdateTasks,
}: {
  data: YattaData;
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
  theme: ReturnType<typeof buildTheme>;
  onBack: () => void;
  onUpdateSettings: (settings: AppSettings) => void;
  onUpdateTasks: (tasks: Task[]) => void;
}) {
  const isBlackYellow = theme.variant === "blackYellow";
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View
      style={[
        styles.settingsScreen,
        isBlackYellow && !isTablet && styles.blackYellowSettingsScreen,
        { backgroundColor: theme.settingsBackground },
      ]}
    >
      <View
        style={[
          styles.settingsHeader,
          isBlackYellow && !isTablet && styles.blackYellowContentWidth,
          { backgroundColor: theme.headerBackground },
        ]}
      >
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={[styles.backText, { color: theme.headerText }]}>{"< 戻る"}</Text>
        </Pressable>
        <Text style={[styles.settingsTitle, { color: theme.headerText }]}>設定</Text>
        <View style={styles.headerSpacer} />
      </View>
      <SegmentTabs
        activeKey={settingsTab}
        onChange={setSettingsTab}
        tabs={[
          { key: "basic", label: "基本設定" },
          { key: "items", label: "項目設定" },
        ]}
        theme={theme}
        uniformBottomBorder={isBlackYellow}
      />
      {settingsTab === "basic" ? (
        <BasicSettings
          settings={data.settings}
          theme={theme}
          onUpdateSettings={onUpdateSettings}
        />
      ) : (
        <ItemSettings tasks={data.tasks} theme={theme} onUpdateTasks={onUpdateTasks} />
      )}
    </View>
  );
}

function BasicSettings({
  settings,
  theme,
  onUpdateSettings,
}: {
  settings: AppSettings;
  theme: ReturnType<typeof buildTheme>;
  onUpdateSettings: (settings: AppSettings) => void;
}) {
  const setResetTime = (resetTime: string) =>
    onUpdateSettings({ ...settings, resetTime: normalizeTime(resetTime) });

  const setPeriodTime = (period: Period, value: string) =>
    onUpdateSettings({
      ...settings,
      periodStartTimes: {
        ...settings.periodStartTimes,
        [period]: normalizeTime(value),
      },
    });

  const setThemeColor = (themeColor: ThemeColor) =>
    onUpdateSettings({ ...settings, themeColor });
  const setFunCompletions = (funCompletions: boolean) =>
    onUpdateSettings({ ...settings, funCompletions });
  const isBlackYellow = theme.variant === "blackYellow";
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;

  return (
    <View
      style={[
        styles.settingsBody,
        isBlackYellow && !isTablet && styles.blackYellowContentWidth,
        isBlackYellow && styles.blackYellowSettingsFrame,
        { backgroundColor: theme.settingsBackground },
      ]}
    >
      <ScrollView
        style={[
          styles.settingsScroller,
          isBlackYellow && styles.blackYellowSettingsScroller,
        ]}
      contentContainerStyle={[
        styles.settingsBodyContent,
        isTablet && styles.tabletSettingsBodyContent,
        isBlackYellow && styles.blackYellowSettingsBodyContent,
      ]}
      >
        <View
          style={[
            styles.settingRow,
            isBlackYellow && styles.blackYellowSettingSection,
            {
              backgroundColor: theme.settingsPanelBackground,
              borderColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.settingLabel, { color: theme.text }]}>毎日</Text>
          <TimeInput value={settings.resetTime} theme={theme} onChangeText={setResetTime} />
          <Text style={[styles.settingLabel, { color: theme.text }]}>にリセットする</Text>
        </View>
        <View
          style={[
            styles.settingBlock,
            isBlackYellow && styles.blackYellowSettingSection,
            {
              backgroundColor: theme.settingsPanelBackground,
              borderColor: theme.primary,
            },
          ]}
        >
          {PERIODS.map((key) => (
            <View key={key} style={styles.periodTimeRow}>
              <TimeInput
                value={settings.periodStartTimes[key]}
                theme={theme}
                onChangeText={(value) => setPeriodTime(key, value)}
              />
              <Text style={[styles.settingLabel, { color: theme.text }]}>
                から「{PERIOD_LABELS[key]}」に切り替える
              </Text>
            </View>
          ))}
        </View>
        <View
          style={[
            styles.settingRow,
            styles.colorRow,
            isBlackYellow && styles.blackYellowSettingSection,
            {
              backgroundColor: theme.settingsPanelBackground,
              borderColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.settingLabel, { color: theme.text }]}>色</Text>
          <View style={styles.swatches}>
            {(Object.keys(THEME_COLORS) as ThemeColor[]).map((key) => (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={`${key}テーマ`}
                onPress={() => setThemeColor(key)}
                style={[
                  styles.swatchOuter,
                  {
                    borderColor: settings.themeColor === key ? "#FFFFFF" : "transparent",
                    shadowOpacity: settings.themeColor === key ? 0.3 : 0,
                  },
                ]}
              >
                <ThemeSwatch themeColor={key} />
              </Pressable>
            ))}
          </View>
        </View>
        <View
          style={[
            styles.settingRow,
            styles.funSettingRow,
            isBlackYellow && styles.blackYellowSettingSection,
            {
              backgroundColor: theme.settingsPanelBackground,
              borderColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.settingLabel, { color: theme.text }]}>
            タスク完了を楽しくする
          </Text>
          <Switch
            value={settings.funCompletions}
            onValueChange={setFunCompletions}
            trackColor={{
              false: theme.chipInactiveBackground,
              true: theme.primary,
            }}
            thumbColor="#FFFFFF"
            ios_backgroundColor={theme.chipInactiveBackground}
          />
        </View>
        <View
          style={[
            styles.soundCreditRow,
            {
              backgroundColor: theme.settingsPanelBackground,
              borderColor: theme.primary,
            },
          ]}
        >
          <Text style={[styles.soundCreditText, { color: theme.text }]}>
            音源：OtoLogic、音人
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

function ThemeSwatch({ themeColor }: { themeColor: ThemeColor }) {
  if (themeColor === "blackYellow") {
    return (
      <View style={[styles.swatch, styles.blackYellowSwatch]}>
        <View style={styles.blackYellowSwatchTriangle} />
      </View>
    );
  }

  return (
    <View
      style={[
        styles.swatch,
        {
          backgroundColor: THEME_COLORS[themeColor],
        },
      ]}
    />
  );
}

function TimeInput({
  value,
  theme,
  onChangeText,
}: {
  value: string;
  theme: ReturnType<typeof buildTheme>;
  onChangeText: (value: string) => void;
}) {
  return (
    <TextInput
      keyboardType="numbers-and-punctuation"
      maxLength={5}
      onChangeText={onChangeText}
      style={[
        styles.timeInput,
        { borderColor: theme.variant === "blackYellow" ? "#000000" : theme.primary },
      ]}
      value={value}
    />
  );
}

function ItemSettings({
  tasks,
  theme,
  onUpdateTasks,
}: {
  tasks: Task[];
  theme: ReturnType<typeof buildTheme>;
  onUpdateTasks: (tasks: Task[]) => void;
}) {
  const sortedTasks = useMemo(() => [...tasks].sort(byOrder), [tasks]);
  const isBlackYellow = theme.variant === "blackYellow";
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const titleInputRefs = useRef<Record<string, TextInput | null>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const pendingAddedTaskIdRef = useRef<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  useEffect(() => {
    if (!pendingAddedTaskIdRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd?.({ animated: true });
      pendingAddedTaskIdRef.current = null;
    }, 80);
    return () => clearTimeout(timer);
  }, [sortedTasks.length]);

  const updateTask = useCallback(
    (taskId: string, patch: Partial<Task>) => {
      onUpdateTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
    },
    [onUpdateTasks, tasks],
  );

  const toggleSchedule = useCallback(
    (task: Task, period: Period, day: number) => {
      const schedule = getTaskSchedule(task);
      const days = schedule[period].includes(day)
        ? schedule[period].filter((value) => value !== day)
        : uniqueDays([...schedule[period], day]);
      const nextSchedule = {
        ...schedule,
        [period]: days,
      };
      updateTask(task.id, {
        schedule: nextSchedule,
        days: getTaskDays(nextSchedule),
        periods: getTaskPeriods(nextSchedule),
      });
    },
    [updateTask],
  );

  const deleteTask = useCallback(
    (taskId: string) => {
      Alert.alert("削除しますか？", "このタスクを項目設定から削除します。", [
        { text: "キャンセル", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: () => onUpdateTasks(tasks.filter((task) => task.id !== taskId)),
        },
      ]);
    },
    [onUpdateTasks, tasks],
  );

  const addTask = useCallback(() => {
    const maxOrder = tasks.reduce((max, task) => Math.max(max, task.order), 0);
    const nextTaskId = `task-${Date.now()}`;
    pendingAddedTaskIdRef.current = nextTaskId;
    onUpdateTasks([
      ...tasks,
      {
        id: nextTaskId,
        title: "新しいタスク",
        days: [1, 2, 3, 4, 5],
        periods: ["morning"],
        schedule: {
          morning: [1, 2, 3, 4, 5],
          daytime: [],
          night: [],
        },
        order: maxOrder + 1,
      },
    ]);
  }, [onUpdateTasks, tasks]);

  const moveTask = useCallback(
    (taskId: string, direction: -1 | 1) => {
      const currentIndex = sortedTasks.findIndex((task) => task.id === taskId);
      const targetIndex = currentIndex + direction;
      if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedTasks.length) {
        return;
      }

      const orderedTasks = [...sortedTasks];
      const [movingTask] = orderedTasks.splice(currentIndex, 1);
      orderedTasks.splice(targetIndex, 0, movingTask);
      const orderById = new Map(
        orderedTasks.map((task, index) => [task.id, index + 1]),
      );
      onUpdateTasks(
        tasks.map((task) => ({
          ...task,
          order: orderById.get(task.id) ?? task.order,
        })),
      );
    },
    [onUpdateTasks, sortedTasks, tasks],
  );

  return (
    <View
      style={[
        styles.itemsWrap,
        isBlackYellow && !isTablet && styles.blackYellowContentWidth,
        isBlackYellow && styles.blackYellowSettingsFrame,
        { backgroundColor: theme.settingsBackground },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        style={[
          styles.itemsScroller,
          isBlackYellow && styles.blackYellowSettingsScroller,
        ]}
        contentContainerStyle={[
          styles.itemsList,
          isTablet && styles.tabletItemsList,
          isBlackYellow && styles.blackYellowItemsList,
        ]}
      >
        {sortedTasks.map((task, index) => {
          return (
            <Animated.View
              key={task.id}
              layout={reorderLayoutTransition}
              style={[
                styles.itemCard,
                isBlackYellow && styles.blackYellowItemCard,
                {
                  backgroundColor: theme.settingsPanelBackground,
                  borderColor: theme.primary,
                },
              ]}
            >
              <ItemScheduleCardContent
                task={task}
                theme={theme}
                isTablet={isTablet}
                disabled={false}
                isEditing={editingTaskId === task.id}
                canMoveUp={index > 0}
                canMoveDown={index < sortedTasks.length - 1}
                titleInputRef={(input) => {
                  titleInputRefs.current[task.id] = input;
                }}
                onChangeTitle={(title) => updateTask(task.id, { title })}
                onEditTitle={() => {
                  setEditingTaskId(task.id);
                  requestAnimationFrame(() => titleInputRefs.current[task.id]?.focus());
                }}
                onBlurTitle={() => setEditingTaskId(null)}
                onDelete={() => deleteTask(task.id)}
                onMoveUp={() => moveTask(task.id, -1)}
                onMoveDown={() => moveTask(task.id, 1)}
                onToggleSchedule={(period, day) => toggleSchedule(task, period, day)}
              />
            </Animated.View>
          );
        })}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="項目を追加"
        onPress={addTask}
        style={[
          styles.addButton,
          isTablet && styles.tabletAddButton,
          { backgroundColor: theme.addButtonBackground },
        ]}
      >
        <Ionicons name="add" size={isTablet ? 64 : 46} color={theme.addButtonIcon} />
      </Pressable>
    </View>
  );
}

function ItemScheduleCardContent({
  task,
  theme,
  isTablet,
  disabled,
  isEditing,
  titleInputRef,
  onChangeTitle,
  onEditTitle,
  onBlurTitle,
  onDelete,
  onMoveUp,
  onMoveDown,
  onToggleSchedule,
  canMoveUp,
  canMoveDown,
}: {
  task: Task;
  theme: ReturnType<typeof buildTheme>;
  isTablet: boolean;
  disabled: boolean;
  isEditing: boolean;
  canMoveUp: boolean;
  canMoveDown: boolean;
  titleInputRef: (input: TextInput | null) => void;
  onChangeTitle: (title: string) => void;
  onEditTitle: () => void;
  onBlurTitle: () => void;
  onDelete: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onToggleSchedule: (period: Period, day: number) => void;
}) {
  return (
    <>
      <View style={styles.itemTop}>
        <View style={styles.itemTitleWrap}>
          {isEditing ? (
            <TextInput
              ref={titleInputRef}
              value={task.title}
              editable={!disabled}
              onBlur={onBlurTitle}
              onChangeText={onChangeTitle}
              style={[
                styles.itemTitleInput,
                {
                  color: theme.text,
                },
              ]}
            />
          ) : (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${task.title}を編集`}
              disabled={disabled}
              onPress={onEditTitle}
              style={styles.itemTitleDisplayWrap}
            >
              <Text
                numberOfLines={1}
                ellipsizeMode="tail"
                style={[styles.itemTitleDisplay, { color: theme.text }]}
              >
                {task.title}
              </Text>
            </Pressable>
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${task.title}を編集`}
            disabled={disabled}
            hitSlop={8}
            onPress={onEditTitle}
          >
            <Ionicons name="pencil" size={18} color={theme.primary} />
          </Pressable>
        </View>
        <View style={styles.itemActions}>
          <Pressable disabled={disabled} onPress={onDelete} hitSlop={8}>
            <Text style={[styles.deleteText, { color: theme.text }]}>削除</Text>
          </Pressable>
          <View style={styles.orderButtonGroup}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${task.title}を上に移動`}
              accessibilityState={{ disabled: disabled || !canMoveUp }}
              disabled={disabled || !canMoveUp}
              hitSlop={8}
              onPress={onMoveUp}
              style={[
                styles.orderButton,
                isTablet && styles.tabletOrderButton,
                (!canMoveUp || disabled) && styles.orderButtonDisabled,
              ]}
            >
              <Ionicons name="chevron-up" size={isTablet ? 28 : 24} color={theme.text} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`${task.title}を下に移動`}
              accessibilityState={{ disabled: disabled || !canMoveDown }}
              disabled={disabled || !canMoveDown}
              hitSlop={8}
              onPress={onMoveDown}
              style={[
                styles.orderButton,
                isTablet && styles.tabletOrderButton,
                (!canMoveDown || disabled) && styles.orderButtonDisabled,
              ]}
            >
              <Ionicons name="chevron-down" size={isTablet ? 28 : 24} color={theme.text} />
            </Pressable>
          </View>
        </View>
      </View>
      <View style={styles.scheduleMatrix}>
        <View style={styles.scheduleHeaderRow}>
          <View style={styles.schedulePeriodLabelSpacer} />
          {DAY_ORDER.map((day) => (
            <Text
              key={day}
              style={[styles.scheduleDayLabel, { color: theme.text }]}
            >
              {DAY_LABELS[day]}
            </Text>
          ))}
        </View>
        {PERIODS.map((key) => {
          const schedule = getTaskSchedule(task);
          return (
            <View key={key} style={styles.scheduleRow}>
              <Text style={[styles.schedulePeriodLabel, { color: theme.text }]}>
                {PERIOD_SETTING_LABELS[key]}
              </Text>
              {DAY_ORDER.map((day) => (
                <MatrixToggleCell
                  key={`${key}-${day}`}
                  active={schedule[key].includes(day)}
                  theme={theme}
                  disabled={disabled}
                  onPress={() => onToggleSchedule(key, day)}
                />
              ))}
            </View>
          );
        })}
      </View>
    </>
  );
}

function MatrixToggleCell({
  active,
  disabled = false,
  theme,
  onPress,
}: {
  active: boolean;
  disabled?: boolean;
  theme: ReturnType<typeof buildTheme>;
  onPress: () => void;
}) {
  const isBlackYellow = theme.variant === "blackYellow";

  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: active }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.matrixCell,
        {
          backgroundColor: active ? theme.primary : theme.chipInactiveBackground,
          borderColor: isBlackYellow
            ? theme.chipInactiveBorder
            : active
              ? theme.primary
              : theme.chipInactiveBorder,
          borderWidth: active && !isBlackYellow ? 0 : 1,
          borderStyle: active ? "solid" : "dashed",
        },
      ]}
    >
      {active ? (
        <Ionicons name="checkmark" size={18} color={theme.chipActiveText} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  loading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screen: {
    flex: 1,
    alignItems: "center",
  },
  mainHeader: {
    height: 48,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  tabletMainHeader: {
    height: 56,
  },
  blackYellowContentWidth: {
    alignSelf: "center",
    maxWidth: 400,
    width: "100%",
  },
  appTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 0,
    fontWeight: "600",
    marginRight: 12,
  },
  blackYellowAppTitle: {
    fontWeight: "600",
  },
  headerLargeDatePart: {
    fontWeight: "600",
  },
  headerDateUnit: {
    fontSize: 16,
    fontWeight: "600",
  },
  blackYellowSettingsIcon: {
    opacity: 0.4,
  },
  iconButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  resetBand: {
    width: "100%",
    height: 40,
    marginBottom: 0,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: 24,
    paddingRight: 0,
    paddingVertical: 8,
  },
  blackYellowResetBand: {
    height: 40,
    alignItems: "center",
    paddingVertical: 0,
  },
  tabletResetBand: {
    height: 52,
    paddingVertical: 10,
  },
  tabletBlackYellowResetBand: {
    height: 48,
    paddingVertical: 0,
  },
  resetButton: {
    height: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  resetText: {
    fontSize: 16,
    fontWeight: "600",
  },
  tabletResetText: {
    fontSize: 20,
  },
  remainingPill: {
    height: 42,
    minWidth: 125,
    borderTopLeftRadius: 9999,
    borderBottomLeftRadius: 9999,
    paddingLeft: 24,
    paddingRight: 16,
    paddingVertical: 4,
    position: "absolute",
    right: 0,
    top: 9,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "flex-end",
    gap: 4,
  },
  tabletRemainingPill: {
    height: 50,
    minWidth: 148,
    top: 11,
  },
  remainingSmall: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
    marginBottom: 1,
  },
  tabletRemainingSmall: {
    fontSize: 24,
    lineHeight: 29,
  },
  remainingBig: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: -2,
  },
  tabletRemainingBig: {
    fontSize: 36,
    lineHeight: 36,
  },
  blackYellowRemaining: {
    height: 40,
    flexDirection: "row",
    alignItems: "stretch",
  },
  tabletBlackYellowRemaining: {
    height: 48,
  },
  blackYellowRemainingWedge: {
    width: 46,
    height: 40,
    backgroundColor: "#000000",
    transform: [{ skewX: "-30deg" }],
    marginRight: -12,
  },
  tabletBlackYellowRemainingWedge: {
    width: 54,
    height: 48,
    marginRight: -14,
  },
  blackYellowRemainingBody: {
    height: 40,
    minWidth: 124,
    paddingLeft: 4,
    paddingRight: 20,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  tabletBlackYellowRemainingBody: {
    height: 48,
    minWidth: 148,
  },
  wave: {
    height: 11,
    width: "100%",
    zIndex: 1,
    overflow: "hidden",
  },
  waveImage: {
    width: "100%",
    height: 11,
  },
  taskScroll: {
    width: "100%",
  },
  taskList: {
    width: "100%",
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 32,
    gap: 16,
  },
  tabletTaskList: {
    paddingHorizontal: 80,
    paddingTop: 40,
    paddingBottom: 40,
  },
  blackYellowTaskList: {
    paddingTop: 16,
    gap: 24,
  },
  empty: {
    flex: 1,
    minHeight: 360,
    alignItems: "center",
    justifyContent: "center",
  },
  completeLogo: {
    width: 132,
    height: 180,
  },
  tabletCompleteLogo: {
    width: 180,
    height: 245,
  },
  settingsScreen: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  blackYellowSettingsScreen: {
    alignItems: "center",
  },
  settingsHeader: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
  },
  backButton: {
    width: 72,
    height: 40,
    justifyContent: "center",
  },
  backText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  settingsTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  headerSpacer: {
    width: 72,
  },
  settingsBody: {
    flex: 1,
  },
  settingsScroller: {
    flex: 1,
  },
  blackYellowSettingsFrame: {
    padding: 8,
  },
  blackYellowSettingsScroller: {
    backgroundColor: "#FFFFFF",
  },
  settingsBodyContent: {
    paddingTop: 8,
  },
  tabletSettingsBodyContent: {
    alignItems: "stretch",
  },
  blackYellowSettingsBodyContent: {
    paddingTop: 0,
    paddingHorizontal: 0,
    paddingBottom: 0,
  },
  settingRow: {
    minHeight: 72,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  blackYellowSettingSection: {
    borderBottomWidth: 2,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: "600",
  },
  timeInput: {
    width: 74,
    height: 40,
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 12,
    backgroundColor: "#FFFFFF",
    color: "#1A1A1A",
    fontSize: 16,
    textAlign: "center",
  },
  settingBlock: {
    borderBottomWidth: 1,
    paddingVertical: 8,
  },
  periodTimeRow: {
    minHeight: 56,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 24,
  },
  colorRow: {
    gap: 24,
  },
  funSettingRow: {
    justifyContent: "space-between",
  },
  soundCreditRow: {
    minHeight: 48,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  soundCreditText: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.72,
  },
  swatches: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  swatchOuter: {
    width: 48,
    height: 48,
    borderRadius: 12,
    borderWidth: 3,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 0 },
    shadowRadius: 8,
  },
  swatch: {
    width: 40,
    height: 40,
    borderRadius: 8,
    overflow: "hidden",
  },
  blackYellowSwatch: {
    backgroundColor: "#BEE853",
  },
  blackYellowSwatchTriangle: {
    position: "absolute",
    top: 0,
    left: 0,
    width: 0,
    height: 0,
    borderTopWidth: 40,
    borderRightWidth: 40,
    borderTopColor: "#000000",
    borderRightColor: "transparent",
    borderStyle: "solid",
  },
  itemsWrap: {
    flex: 1,
  },
  itemsScroller: {
    flex: 1,
  },
  itemsList: {
    paddingBottom: 120,
  },
  tabletItemsList: {
    paddingBottom: 168,
  },
  blackYellowItemsList: {
    paddingHorizontal: 0,
    paddingTop: 0,
  },
  itemCard: {
    borderBottomWidth: 1,
    paddingTop: 8,
    paddingHorizontal: 24,
    paddingBottom: 20,
    gap: 10,
  },
  blackYellowItemCard: {
    borderBottomWidth: 2,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  itemTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    minWidth: 0,
  },
  itemTitleDisplayWrap: {
    flexShrink: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  itemTitleDisplay: {
    flexShrink: 1,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
  },
  itemTitleInput: {
    flex: 1,
    minWidth: 0,
    minHeight: 36,
    padding: 0,
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 28,
    textAlignVertical: "center",
    transform: [{ translateY: -2 }],
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "600",
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    minHeight: 44,
    marginRight: -10,
  },
  orderButtonGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  scheduleMatrix: {
    gap: 7,
  },
  scheduleHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  schedulePeriodLabelSpacer: {
    width: 20,
  },
  schedulePeriodLabel: {
    width: 20,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  scheduleDayLabel: {
    flex: 1,
    minWidth: 0,
    fontSize: 14,
    fontWeight: "700",
    textAlign: "center",
  },
  matrixCell: {
    flex: 1,
    minWidth: 0,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  orderButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 34,
    height: 44,
  },
  tabletOrderButton: {
    width: 42,
    height: 52,
  },
  orderButtonDisabled: {
    opacity: 0.22,
  },
  addButton: {
    position: "absolute",
    left: 24,
    bottom: 24,
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.24,
    shadowRadius: 8,
    elevation: 6,
  },
  tabletAddButton: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
});

import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  ThemeColor,
  YattaData,
} from "@/types/yatta";

type Screen = "tasks" | "settings";
type SettingsTab = "basic" | "items";

const blueWaveImage = require("../assets/wave-blue.png");

const freshCompletion = (settings: AppSettings): CompletionState => ({
  date: getCompletionDateKey(settings),
  completedTaskIds: [],
});

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
        task.days.includes(day) &&
        task.periods.includes(period) &&
        !completion.completedTaskIds.includes(completionKey(period, task.id)),
    )
    .sort(byOrder);
};

const getDayForCompletion = (completion: CompletionState) =>
  new Date(`${completion.date}T12:00:00`).getDay();

const getPeriodsWithTasksForDay = (tasks: Task[], completion: CompletionState) => {
  const day = getDayForCompletion(completion);
  return PERIODS.filter((period) =>
    tasks.some((task) => task.days.includes(day) && task.periods.includes(period)),
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

export default function YattaApp() {
  const [data, setData] = useState<YattaData | null>(null);
  const [screen, setScreen] = useState<Screen>("tasks");
  const [period, setPeriod] = useState<Period>("morning");
  const [settingsTab, setSettingsTab] = useState<SettingsTab>("basic");

  useEffect(() => {
    loadYattaData().then((loaded) => {
      const activePeriod = getCurrentPeriod(loaded.settings);
      setData(loaded);
      setPeriod(activePeriod);
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
      updateData((current) => {
        const expectedDate = getCompletionDateKey(current.settings);
        if (current.completion.date === expectedDate) {
          return current;
        }
        return {
          ...current,
          completion: { date: expectedDate, completedTaskIds: [] },
        };
      });
      setPeriod(getCurrentPeriod(data.settings));
    };
    const intervalId = setInterval(syncCompletionDate, 60 * 1000);
    return () => clearInterval(intervalId);
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

  const resetToday = () => {
    updateData((current) => ({
      ...current,
      completion: freshCompletion(current.settings),
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
          onReset={resetToday}
        />
      ) : (
        <SettingsScreen
          data={data}
          settingsTab={settingsTab}
          setSettingsTab={setSettingsTab}
          theme={theme}
          onBack={() => setScreen("tasks")}
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
  const isBlackYellow = theme.variant === "blackYellow";
  const isTablet = width >= 768;
  const isCompactHeader = width < 360;

  useEffect(() => {
    const intervalId = setInterval(() => setNow(new Date()), 30 * 1000);
    return () => clearInterval(intervalId);
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.mainHeader,
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
          isBlackYellow && !isTablet && styles.blackYellowContentWidth,
          { backgroundColor: theme.resetBandBackground },
        ]}
      >
        <Pressable onPress={onReset} hitSlop={10} style={styles.resetButton}>
          <Ionicons name="refresh" size={24} color={theme.resetText} />
          <Text style={[styles.resetText, { color: theme.resetText }]}>
            リセットする
          </Text>
        </Pressable>
        {isBlackYellow ? (
          <View style={styles.blackYellowRemaining}>
            <View style={styles.blackYellowRemainingWedge} />
            <View
              style={[
                styles.blackYellowRemainingBody,
                { backgroundColor: theme.counterBackground },
              ]}
            >
              <Text style={[styles.remainingSmall, { color: theme.counterText }]}>
                のこり
              </Text>
              <Text style={[styles.remainingBig, { color: theme.counterText }]}>
                {counts[period]}
              </Text>
            </View>
          </View>
        ) : (
          <View
            style={[
              styles.remainingPill,
              { backgroundColor: theme.counterBackground },
            ]}
          >
            <Text style={[styles.remainingSmall, { color: theme.counterText }]}>
              のこり
            </Text>
            <Text style={[styles.remainingBig, { color: theme.counterText }]}>
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
            <Text style={[styles.emptyText, { color: theme.text }]}>ぜんぶできた！</Text>
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
}: {
  date: Date;
  isBlackYellow: boolean;
  isCompact: boolean;
}) {
  const month = formatDatePart(date.getMonth() + 1);
  const day = formatDatePart(date.getDate());
  const dayLabel = DAY_LABELS[date.getDay()];
  const time = formatClockTime(date);
  const largeSize = isCompact ? 20 : isBlackYellow ? 22 : 24;
  const dateUnitSize = isCompact ? 16 : 18;

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
    <ScrollView
      style={[
        styles.settingsBody,
        isBlackYellow && !isTablet && styles.blackYellowContentWidth,
        { backgroundColor: theme.settingsBackground },
      ]}
      contentContainerStyle={[
        styles.settingsBodyContent,
        isTablet && styles.tabletSettingsBodyContent,
        isBlackYellow && !isTablet && styles.blackYellowSettingsBodyContent,
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
    </ScrollView>
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
  const sortedTasks = [...tasks].sort(byOrder);
  const isBlackYellow = theme.variant === "blackYellow";
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const titleInputRefs = useRef<Record<string, TextInput | null>>({});
  const scrollRef = useRef<ScrollView | null>(null);
  const pendingAddedTaskIdRef = useRef<string | null>(null);
  const maxTitleInputWidth = Math.max(
    96,
    Math.min(isTablet ? width - 260 : 220, width - 170),
  );

  useEffect(() => {
    if (!pendingAddedTaskIdRef.current) {
      return;
    }
    const timer = setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
      pendingAddedTaskIdRef.current = null;
    }, 80);
    return () => clearTimeout(timer);
  }, [sortedTasks.length]);

  const updateTask = (taskId: string, patch: Partial<Task>) => {
    onUpdateTasks(tasks.map((task) => (task.id === taskId ? { ...task, ...patch } : task)));
  };

  const toggleDay = (task: Task, day: number) => {
    const days = task.days.includes(day)
      ? task.days.filter((value) => value !== day)
      : [...task.days, day].sort((a, b) => a - b);
    updateTask(task.id, { days });
  };

  const togglePeriod = (task: Task, value: Period) => {
    const periods = task.periods.includes(value)
      ? task.periods.filter((period) => period !== value)
      : [...task.periods, value];
    updateTask(task.id, { periods });
  };

  const deleteTask = (taskId: string) => {
    Alert.alert("削除しますか？", "このタスクを項目設定から削除します。", [
      { text: "キャンセル", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: () => onUpdateTasks(tasks.filter((task) => task.id !== taskId)),
      },
    ]);
  };

  const addTask = () => {
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
        order: maxOrder + 1,
      },
    ]);
  };

  const moveTask = (taskId: string, direction: -1 | 1) => {
    const list = [...sortedTasks];
    const index = list.findIndex((task) => task.id === taskId);
    const nextIndex = index + direction;
    if (index < 0 || nextIndex < 0 || nextIndex >= list.length) {
      return;
    }
    [list[index], list[nextIndex]] = [list[nextIndex], list[index]];
    onUpdateTasks(list.map((task, orderIndex) => ({ ...task, order: orderIndex + 1 })));
  };

  return (
    <View
      style={[
        styles.itemsWrap,
        isBlackYellow && !isTablet && styles.blackYellowContentWidth,
        { backgroundColor: theme.settingsBackground },
      ]}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.itemsList,
          isTablet && styles.tabletItemsList,
          isBlackYellow && !isTablet && styles.blackYellowItemsList,
        ]}
      >
        {sortedTasks.map((task, index) => (
          <View
            key={task.id}
            style={[
              styles.itemCard,
              isBlackYellow && styles.blackYellowItemCard,
              {
                backgroundColor: theme.itemCardBackground,
                borderColor: theme.primary,
              },
            ]}
          >
            <View style={styles.itemTop}>
              <View style={styles.itemTitleWrap}>
                <TextInput
                  ref={(input) => {
                    titleInputRefs.current[task.id] = input;
                  }}
                  value={task.title}
                  onChangeText={(title) => updateTask(task.id, { title })}
                  style={[
                    styles.itemTitleInput,
                    {
                      color: theme.text,
                      width: Math.min(
                        maxTitleInputWidth,
                        Math.max(72, task.title.length * 22 + 12),
                      ),
                    },
                  ]}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title}を編集`}
                  hitSlop={8}
                  onPress={() => titleInputRefs.current[task.id]?.focus()}
                >
                  <Ionicons name="pencil" size={18} color={theme.primary} />
                </Pressable>
              </View>
              <Pressable onPress={() => deleteTask(task.id)} hitSlop={8}>
                <Text style={[styles.deleteText, { color: theme.text }]}>削除</Text>
              </Pressable>
            </View>
            <View style={styles.dayGrid}>
              {DAY_ORDER.map((day) => (
                <ToggleChip
                  key={day}
                  active={task.days.includes(day)}
                  label={DAY_LABELS[day]}
                  theme={theme}
                  fill
                  onPress={() => toggleDay(task, day)}
                />
              ))}
            </View>
            <View style={[styles.periodRow, isTablet && styles.tabletPeriodRow]}>
              <View style={styles.periodChips}>
                {PERIODS.map((key) => (
                  <ToggleChip
                    key={key}
                    active={task.periods.includes(key)}
                    label={PERIOD_SETTING_LABELS[key]}
                    theme={theme}
                    fill
                    onPress={() => togglePeriod(task, key)}
                  />
                ))}
                {Array.from({ length: DAY_ORDER.length - PERIODS.length }).map((_, spacerIndex) => (
                  <View key={`period-spacer-${spacerIndex}`} style={styles.periodChipSpacer} />
                ))}
              </View>
              <View style={styles.orderButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title}を上に移動`}
                  disabled={index === 0}
                  onPress={() => moveTask(task.id, -1)}
                  style={[
                    styles.orderButton,
                    isTablet && styles.tabletOrderButton,
                    index === 0 && styles.disabled,
                  ]}
                >
                  <Ionicons name="chevron-up" size={isTablet ? 22 : 18} color={theme.text} />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`${task.title}を下に移動`}
                  disabled={index === sortedTasks.length - 1}
                  onPress={() => moveTask(task.id, 1)}
                  style={[
                    styles.orderButton,
                    isTablet && styles.tabletOrderButton,
                    index === sortedTasks.length - 1 && styles.disabled,
                  ]}
                >
                  <Ionicons name="chevron-down" size={isTablet ? 22 : 18} color={theme.text} />
                </Pressable>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="タスクを追加"
        onPress={addTask}
        style={[
          styles.addButton,
          isTablet && styles.tabletAddButton,
          { backgroundColor: theme.addButtonBackground },
        ]}
      >
        <Ionicons name="add" size={isTablet ? 32 : 44} color={theme.addButtonIcon} />
      </Pressable>
    </View>
  );
}

function ToggleChip({
  active,
  fill = false,
  label,
  theme,
  onPress,
}: {
  active: boolean;
  fill?: boolean;
  label: string;
  theme: ReturnType<typeof buildTheme>;
  onPress: () => void;
}) {
  const isBlackYellow = theme.variant === "blackYellow";

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleChip,
        fill && styles.fillToggleChip,
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
      <Text
        style={[
          styles.toggleText,
          { color: active ? theme.chipActiveText : theme.text },
        ]}
      >
        {label}
      </Text>
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
  remainingSmall: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "600",
    lineHeight: 25,
    marginBottom: 1,
  },
  remainingBig: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "700",
    lineHeight: 32,
    marginBottom: -2,
  },
  blackYellowRemaining: {
    height: 40,
    flexDirection: "row",
    alignItems: "stretch",
  },
  blackYellowRemainingWedge: {
    width: 46,
    height: 40,
    backgroundColor: "#000000",
    transform: [{ skewX: "-30deg" }],
    marginRight: -12,
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
    minHeight: 180,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 28,
    fontWeight: "800",
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
  settingsBodyContent: {
    paddingTop: 8,
  },
  tabletSettingsBodyContent: {
    alignItems: "stretch",
  },
  blackYellowSettingsBodyContent: {
    paddingHorizontal: 8,
    paddingBottom: 8,
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
    backgroundColor: "#9FD80F",
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
  itemsList: {
    paddingBottom: 96,
  },
  tabletItemsList: {
    paddingBottom: 112,
  },
  blackYellowItemsList: {
    paddingHorizontal: 8,
    paddingTop: 8,
  },
  itemCard: {
    borderBottomWidth: 1,
    padding: 24,
    gap: 12,
  },
  blackYellowItemCard: {
    borderBottomWidth: 2,
  },
  itemTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  itemTitleWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  itemTitleInput: {
    minHeight: 36,
    padding: 0,
    fontSize: 20,
    fontWeight: "600",
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "600",
  },
  dayGrid: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
  },
  periodRow: {
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    minHeight: 43,
  },
  tabletPeriodRow: {
    minHeight: 52,
  },
  periodChips: {
    flexDirection: "row",
    width: "100%",
    gap: 8,
  },
  periodChipSpacer: {
    flex: 1,
    minWidth: 0,
    height: 43,
  },
  toggleChip: {
    minWidth: 43,
    height: 43,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  fillToggleChip: {
    flex: 1,
    minWidth: 0,
  },
  toggleText: {
    fontSize: 20,
    fontWeight: "600",
  },
  orderButtons: {
    position: "absolute",
    right: 0,
    bottom: 0,
    flexDirection: "row",
    gap: 4,
  },
  orderButton: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
  },
  tabletOrderButton: {
    width: 52,
    height: 52,
  },
  disabled: {
    opacity: 0.25,
  },
  addButton: {
    position: "absolute",
    right: 24,
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
    width: 52,
    height: 52,
    borderRadius: 26,
  },
});

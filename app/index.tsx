import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
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

const normalizeTime = (value: string) =>
  value
    .replace(/[^\d:]/g, "")
    .replace(/^(\d{2})(\d)/, "$1:$2")
    .slice(0, 5);

const formatHeaderTitle = (date = new Date()) =>
  `${date.getMonth() + 1}月${date.getDate()}日(${DAY_LABELS[date.getDay()]})のYatta!`;

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
          setPeriod={setPeriod}
          tasks={visibleTasks}
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
  setPeriod,
  tasks,
  theme,
  onComplete,
  onOpenSettings,
  onReset,
}: {
  counts: Record<Period, number>;
  period: Period;
  setPeriod: (period: Period) => void;
  tasks: Task[];
  theme: ReturnType<typeof buildTheme>;
  onComplete: (taskId: string, period: Period) => void;
  onOpenSettings: () => void;
  onReset: () => void;
}) {
  const { width } = useWindowDimensions();
  const [isTaskSwipeActive, setTaskSwipeActive] = useState(false);
  const isBlackYellow = theme.variant === "blackYellow";
  const zigzagCount = Math.max(1, Math.round(width / 28.284));
  const zigzagUnit = width / zigzagCount;
  const zigzagSquare = zigzagUnit / Math.SQRT2;
  const headerTitle = isBlackYellow ? "YATTA!" : formatHeaderTitle();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.mainHeader,
          isBlackYellow && styles.blackYellowContentWidth,
          { backgroundColor: theme.headerBackground },
        ]}
      >
        <Text
          style={[
            styles.appTitle,
            isBlackYellow && styles.blackYellowAppTitle,
            { color: theme.headerText },
          ]}
          numberOfLines={1}
        >
          {headerTitle}
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
      <SegmentTabs
        activeKey={period}
        onChange={setPeriod}
        tabs={PERIODS.map((key) => ({
          key,
          label: PERIOD_LABELS[key],
          count: counts[key],
        }))}
        theme={theme}
      />
      <View
        style={[
          styles.resetBand,
          isBlackYellow && styles.blackYellowResetBand,
          isBlackYellow && styles.blackYellowContentWidth,
          { backgroundColor: theme.resetBandBackground },
        ]}
      >
        <Pressable onPress={onReset} hitSlop={10} style={styles.resetButton}>
          <Ionicons name="refresh" size={isBlackYellow ? 24 : 19} color={theme.resetText} />
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
        <View style={styles.zigzag} pointerEvents="none">
          {Array.from({ length: zigzagCount }).map((_, index) => (
            <View
              key={index}
              style={[
                styles.toothSlot,
                {
                  width: zigzagUnit,
                  height: zigzagUnit,
                },
              ]}
            >
              <View
                style={[
                  styles.tooth,
                  {
                    width: zigzagSquare,
                    height: zigzagSquare,
                    backgroundColor: theme.resetBandBackground,
                  },
                ]}
              />
            </View>
          ))}
        </View>
      )}
      <ScrollView
        scrollEnabled={!isTaskSwipeActive}
        style={styles.taskScroll}
        contentContainerStyle={[
          styles.taskList,
          isBlackYellow && styles.blackYellowTaskList,
          isBlackYellow && styles.blackYellowContentWidth,
          { width },
        ]}
      >
        {tasks.map((task) => (
          <TaskCard
            key={completionKey(period, task.id)}
            task={task}
            period={period}
            theme={theme}
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

  return (
    <View
      style={[
        styles.settingsScreen,
        isBlackYellow && styles.blackYellowSettingsScreen,
        { backgroundColor: theme.settingsBackground },
      ]}
    >
      <View
        style={[
          styles.settingsHeader,
          isBlackYellow && styles.blackYellowContentWidth,
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
  const isBlackYellow = theme.variant === "blackYellow";

  return (
    <ScrollView
      style={[
        styles.settingsBody,
        isBlackYellow && styles.blackYellowContentWidth,
        { backgroundColor: theme.settingsBackground },
      ]}
      contentContainerStyle={[
        styles.settingsBodyContent,
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
  const titleInputRefs = useRef<Record<string, TextInput | null>>({});
  const maxTitleInputWidth = Math.max(96, Math.min(220, width - 170));

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
    onUpdateTasks([
      ...tasks,
      {
        id: `task-${Date.now()}`,
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
    const current = list[index];
    const next = list[nextIndex];
    onUpdateTasks(
      tasks.map((task) => {
        if (task.id === current.id) {
          return { ...task, order: next.order };
        }
        if (task.id === next.id) {
          return { ...task, order: current.order };
        }
        return task;
      }),
    );
  };

  return (
    <View
      style={[
        styles.itemsWrap,
        isBlackYellow && styles.blackYellowContentWidth,
        { backgroundColor: theme.settingsBackground },
      ]}
    >
      <ScrollView
        contentContainerStyle={[
          styles.itemsList,
          isBlackYellow && styles.blackYellowItemsList,
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
            <View style={styles.periodRow}>
              <View style={styles.periodChips}>
                {PERIODS.map((key) => (
                  <ToggleChip
                    key={key}
                    active={task.periods.includes(key)}
                    label={PERIOD_SETTING_LABELS[key]}
                    theme={theme}
                    onPress={() => togglePeriod(task, key)}
                  />
                ))}
              </View>
              <View style={styles.orderButtons}>
                <Pressable
                  disabled={index === 0}
                  onPress={() => moveTask(task.id, -1)}
                  style={[styles.orderButton, index === 0 && styles.disabled]}
                >
                  <Ionicons name="chevron-up" size={18} color={theme.text} />
                </Pressable>
                <Pressable
                  disabled={index === sortedTasks.length - 1}
                  onPress={() => moveTask(task.id, 1)}
                  style={[
                    styles.orderButton,
                    index === sortedTasks.length - 1 && styles.disabled,
                  ]}
                >
                  <Ionicons name="chevron-down" size={18} color={theme.text} />
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
        style={[styles.addButton, { backgroundColor: theme.addButtonBackground }]}
      >
        <Ionicons name="add" size={44} color={theme.addButtonIcon} />
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
    fontSize: 18,
    fontWeight: "700",
    marginRight: 12,
  },
  blackYellowAppTitle: {
    fontSize: 20,
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
    height: 64,
    marginBottom: -15,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  blackYellowResetBand: {
    marginBottom: 0,
    paddingRight: 0,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingBottom: 4,
  },
  resetText: {
    fontSize: 16,
    fontWeight: "600",
  },
  remainingPill: {
    height: 40,
    minWidth: 104,
    borderRadius: 999,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  remainingSmall: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 24,
  },
  remainingBig: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 34,
  },
  blackYellowRemaining: {
    height: 36,
    flexDirection: "row",
    alignItems: "flex-end",
  },
  blackYellowRemainingWedge: {
    width: 0,
    height: 0,
    borderBottomWidth: 36,
    borderLeftWidth: 21,
    borderBottomColor: "#000000",
    borderLeftColor: "transparent",
    borderStyle: "solid",
  },
  blackYellowRemainingBody: {
    height: 36,
    minWidth: 74,
    paddingLeft: 4,
    paddingRight: 20,
    paddingVertical: 4,
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "center",
    gap: 4,
  },
  zigzag: {
    height: 28,
    width: "100%",
    zIndex: 1,
    flexDirection: "row",
    overflow: "hidden",
    paddingHorizontal: 0,
  },
  toothSlot: {
    alignItems: "center",
    justifyContent: "center",
  },
  tooth: {
    backgroundColor: "#FFFFFF",
    transform: [{ rotate: "45deg" }],
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  periodChips: {
    flexDirection: "row",
    gap: 8,
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
    flexDirection: "row",
    gap: 4,
  },
  orderButton: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
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
});

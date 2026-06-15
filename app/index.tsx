import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import { useEffect, useMemo, useState } from "react";
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
    <SafeAreaView style={[styles.safe, { backgroundColor: theme.primary }]}>
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
  const zigzagCount = Math.max(1, Math.round(width / 28.284));
  const zigzagUnit = width / zigzagCount;
  const zigzagSquare = zigzagUnit / Math.SQRT2;
  const headerTitle = formatHeaderTitle();

  return (
    <View style={[styles.screen, { backgroundColor: theme.background }]}>
      <View style={[styles.mainHeader, { backgroundColor: theme.primary }]}>
        <Text style={styles.appTitle} numberOfLines={1}>
          {headerTitle}
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="設定を開く"
          onPress={onOpenSettings}
          style={styles.iconButton}
        >
          <Ionicons name="settings-outline" size={35} color="rgba(255,255,255,0.55)" />
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
      <View style={styles.resetBand}>
        <Pressable onPress={onReset} hitSlop={10}>
          <Text style={[styles.resetText, { color: theme.text }]}>リセットする</Text>
        </Pressable>
        <View style={[styles.remainingPill, { backgroundColor: theme.primary }]}>
          <Text style={styles.remainingSmall}>のこり</Text>
          <Text style={styles.remainingBig}>{counts[period]}</Text>
        </View>
      </View>
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
                },
              ]}
            />
          </View>
        ))}
      </View>
      <ScrollView
        scrollEnabled={!isTaskSwipeActive}
        style={styles.taskScroll}
        contentContainerStyle={[styles.taskList, { width }]}
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
  return (
    <View style={styles.settingsScreen}>
      <View style={[styles.settingsHeader, { backgroundColor: theme.primary }]}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backText}>{"< 戻る"}</Text>
        </Pressable>
        <Text style={styles.settingsTitle}>設定</Text>
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
      <Text style={[styles.soundCredit, { color: theme.text }]}>音源：otologic</Text>
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

  return (
    <ScrollView style={styles.settingsBody}>
      <View style={[styles.settingRow, { borderColor: theme.primary }]}>
        <Text style={[styles.settingLabel, { color: theme.text }]}>毎日</Text>
        <TimeInput value={settings.resetTime} theme={theme} onChangeText={setResetTime} />
        <Text style={[styles.settingLabel, { color: theme.text }]}>にリセットする</Text>
      </View>
      <View style={[styles.settingBlock, { borderColor: theme.primary }]}>
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
      <View style={[styles.settingRow, styles.colorRow, { borderColor: theme.primary }]}>
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
              <View
                style={[
                  styles.swatch,
                  {
                    backgroundColor: THEME_COLORS[key],
                  },
                ]}
              />
            </Pressable>
          ))}
        </View>
      </View>
    </ScrollView>
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
      style={[styles.timeInput, { borderColor: theme.primary }]}
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
    <View style={styles.itemsWrap}>
      <ScrollView contentContainerStyle={styles.itemsList}>
        {sortedTasks.map((task, index) => (
          <View key={task.id} style={[styles.itemCard, { borderColor: theme.primary }]}>
            <View style={styles.itemTop}>
              <View style={styles.itemTitleWrap}>
                <TextInput
                  value={task.title}
                  onChangeText={(title) => updateTask(task.id, { title })}
                  style={[styles.itemTitleInput, { color: theme.text }]}
                />
                <Ionicons name="pencil" size={18} color={theme.primary} />
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
        style={[styles.addButton, { backgroundColor: theme.primary }]}
      >
        <Ionicons name="add" size={44} color="#FFFFFF" />
      </Pressable>
    </View>
  );
}

function ToggleChip({
  active,
  label,
  theme,
  onPress,
}: {
  active: boolean;
  label: string;
  theme: ReturnType<typeof buildTheme>;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.toggleChip,
        {
          backgroundColor: active ? theme.primary : "#FFFFFF",
          borderColor: theme.primary,
          borderWidth: active ? 0 : 1,
          borderStyle: active ? "solid" : "dashed",
        },
      ]}
    >
      <Text style={[styles.toggleText, { color: active ? theme.softText : theme.text }]}>
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
  appTitle: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginRight: 12,
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
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  resetText: {
    fontSize: 16,
    fontWeight: "600",
    paddingBottom: 4,
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
  soundCredit: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    fontSize: 12,
    opacity: 0.6,
    textAlign: "right",
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
  },
  itemsWrap: {
    flex: 1,
  },
  itemsList: {
    paddingBottom: 96,
  },
  itemCard: {
    borderBottomWidth: 1,
    padding: 24,
    gap: 12,
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
    flex: 1,
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

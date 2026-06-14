import { Pressable, StyleSheet, Text, View } from "react-native";

import { Theme } from "@/types/yatta";

type Tab<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

type Props<T extends string> = {
  tabs: Tab<T>[];
  activeKey: T;
  theme: Theme;
  onChange: (key: T) => void;
};

export function SegmentTabs<T extends string>({
  tabs,
  activeKey,
  theme,
  onChange,
}: Props<T>) {
  return (
    <View style={[styles.wrap, { backgroundColor: theme.primary }]}>
      {tabs.map((tab, index) => {
        const active = tab.key === activeKey;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              {
                backgroundColor: active ? "#FFFFFF" : theme.background,
                borderColor: theme.primary,
                borderRightWidth: index === tabs.length - 1 ? 0 : 2,
                borderBottomWidth: active ? 0 : 2,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                { color: theme.text, fontSize: active ? 20 : 16 },
              ]}
            >
              {tab.label}
            </Text>
            {typeof tab.count === "number" && tab.count > 0 ? (
              <View style={[styles.badge, { backgroundColor: theme.primary }]}>
                <Text style={styles.badgeText}>{tab.count}</Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    height: 48,
    width: "100%",
  },
  tab: {
    flex: 1,
    minWidth: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 4,
  },
  tabText: {
    fontWeight: "600",
    letterSpacing: 0.8,
  },
  badge: {
    width: 24,
    height: 24,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 18,
  },
});

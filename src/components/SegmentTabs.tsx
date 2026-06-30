import { Pressable, StyleSheet, Text, useWindowDimensions, View } from "react-native";

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
  tabletTextBoost?: boolean;
  uniformBottomBorder?: boolean;
};

export function SegmentTabs<T extends string>({
  tabs,
  activeKey,
  theme,
  onChange,
  tabletTextBoost = false,
  uniformBottomBorder = false,
}: Props<T>) {
  const isBlackYellow = theme.variant === "blackYellow";
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const textBoost = tabletTextBoost && isTablet ? 4 : 0;

  return (
    <View
      style={[
        styles.wrap,
        tabletTextBoost && isTablet && styles.tabletWrap,
        isBlackYellow && !isTablet && styles.blackYellowWrap,
        { backgroundColor: theme.headerBackground },
      ]}
    >
      {tabs.map((tab, index) => {
        const active = tab.key === activeKey;
        const showBadge =
          typeof tab.count === "number" &&
          tab.count > 0 &&
          !(isBlackYellow && active);
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={[
              styles.tab,
              isBlackYellow && styles.blackYellowTab,
              {
                backgroundColor: active
                  ? theme.tabActiveBackground
                  : theme.tabInactiveBackground,
                borderColor: theme.primary,
                borderRightWidth: index === tabs.length - 1 ? 0 : 2,
                borderBottomWidth: uniformBottomBorder || !active ? 2 : 0,
              },
            ]}
          >
            <Text
              style={[
                styles.tabText,
                {
                  color: active ? theme.tabActiveText : theme.tabInactiveText,
                  fontSize: (active ? 20 : 16) + textBoost,
                },
              ]}
            >
              {tab.label}
            </Text>
            {showBadge ? (
              <View
                style={[
                  styles.badge,
                  {
                    backgroundColor: theme.tabBadgeBackground,
                    width: 24 + textBoost,
                    height: 24 + textBoost,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    {
                      color: theme.tabBadgeText,
                      fontSize: 16 + textBoost,
                      lineHeight: 18 + textBoost,
                    },
                  ]}
                >
                  {tab.count}
                </Text>
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
  tabletWrap: {
    height: 56,
  },
  blackYellowWrap: {
    backgroundColor: "#000000",
    maxWidth: 400,
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
  blackYellowTab: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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

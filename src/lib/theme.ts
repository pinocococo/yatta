import { Theme, ThemeColor } from "@/types/yatta";

export const THEME_COLORS: Record<ThemeColor, string> = {
  blue: "#00B4CA",
  blackYellow: "#9FD80F",
};

export const normalizeThemeColor = (themeColor?: string): ThemeColor =>
  themeColor === "blackYellow" || themeColor === "blue" ? themeColor : "blue";

const hexToRgb = (hex: string) => {
  const value = hex.replace("#", "");
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
};

const componentToHex = (value: number) =>
  Math.round(value).toString(16).padStart(2, "0").toUpperCase();

export const blendHex = (base: string, overlay: string, alpha: number) => {
  const source = hexToRgb(base);
  const top = hexToRgb(overlay);
  const mix = {
    r: source.r * (1 - alpha) + top.r * alpha,
    g: source.g * (1 - alpha) + top.g * alpha,
    b: source.b * (1 - alpha) + top.b * alpha,
  };
  return `#${componentToHex(mix.r)}${componentToHex(mix.g)}${componentToHex(mix.b)}`;
};

export const buildTheme = (themeColor: ThemeColor | string): Theme => {
  const normalizedThemeColor = normalizeThemeColor(themeColor);
  if (normalizedThemeColor === "blackYellow") {
    return {
      variant: "blackYellow",
      primary: THEME_COLORS.blackYellow,
      text: "#000000",
      background: "#000000",
      softText: "#000000",
      headerBackground: "#000000",
      headerText: THEME_COLORS.blackYellow,
      resetBandBackground: THEME_COLORS.blackYellow,
      resetText: "#000000",
      counterBackground: "#000000",
      counterText: "#FFFFFF",
      tabActiveBackground: THEME_COLORS.blackYellow,
      tabInactiveBackground: "#000000",
      tabActiveText: "#000000",
      tabInactiveText: THEME_COLORS.blackYellow,
      tabBadgeBackground: THEME_COLORS.blackYellow,
      tabBadgeText: "#000000",
      cardBackground: "#000000",
      cardText: "#FFFFFF",
      settingsBackground: THEME_COLORS.blackYellow,
      settingsPanelBackground: "#FFFFFF",
      itemCardBackground: "#FFFFFF",
      chipActiveText: "#000000",
      chipInactiveBackground: "#FFFFFF",
      chipInactiveBorder: "#000000",
      addButtonBackground: "#000000",
      addButtonIcon: "#FFFFFF",
    };
  }

  const primary = THEME_COLORS[normalizedThemeColor];
  return {
    variant: "blue",
    primary,
    text: blendHex(primary, "#000000", 0.5),
    background: blendHex(primary, "#FFFFFF", 0.8),
    softText: blendHex(primary, "#FFFFFF", 0.86),
    headerBackground: primary,
    headerText: "#FFFFFF",
    resetBandBackground: "#FFFFFF",
    resetText: blendHex(primary, "#000000", 0.5),
    counterBackground: primary,
    counterText: "#FFFFFF",
    tabActiveBackground: "#FFFFFF",
    tabInactiveBackground: blendHex(primary, "#FFFFFF", 0.8),
    tabActiveText: blendHex(primary, "#000000", 0.5),
    tabInactiveText: blendHex(primary, "#000000", 0.5),
    tabBadgeBackground: primary,
    tabBadgeText: "#FFFFFF",
    cardBackground: "#FFFFFF",
    cardText: blendHex(primary, "#000000", 0.5),
    settingsBackground: "#FFFFFF",
    settingsPanelBackground: "#FFFFFF",
    itemCardBackground: "#FFFFFF",
    chipActiveText: blendHex(primary, "#FFFFFF", 0.86),
    chipInactiveBackground: "#FFFFFF",
    chipInactiveBorder: primary,
    addButtonBackground: blendHex(primary, "#000000", 0.5),
    addButtonIcon: "#FFFFFF",
  };
};

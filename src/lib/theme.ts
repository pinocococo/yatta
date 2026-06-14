import { Theme, ThemeColor } from "@/types/yatta";

export const THEME_COLORS: Record<ThemeColor, string> = {
  blue: "#00B4CA",
  black: "#33333D",
  pink: "#D067A9",
  purple: "#8157B5",
};

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

export const buildTheme = (themeColor: ThemeColor): Theme => {
  const primary = THEME_COLORS[themeColor];
  return {
    primary,
    text: blendHex(primary, "#000000", 0.5),
    background: blendHex(primary, "#FFFFFF", 0.8),
    softText: blendHex(primary, "#FFFFFF", 0.86),
  };
};

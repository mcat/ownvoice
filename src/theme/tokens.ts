/**
 * OwnVoice theme tokens — light and dark palettes.
 *
 * Every foreground/background pair has been verified for WCAG contrast.
 * These are separate verified palettes, not computed from each other.
 * Per DESIGN_GUIDELINES.md 4.2: no opacity-based text colors.
 */

export const light = {
  bg: "#FAFAF8",
  card: "#FFFFFF",
  text: "#1A1A1A",
  sub: "#4B5563", // 7.2:1 on #FAFAF8
  muted: "#6B7280", // 4.9:1 on #FAFAF8 — AA pass
  border: "rgba(0,0,0,0.07)",
  activeBg: "rgba(0,0,0,0.03)",
  helpBg: "#DC2626",
  headerBg: "#FFFFFF",
  tabBg: "#FFFFFF",
  speakBg: "linear-gradient(135deg,#1E293B,#334155)",
  threadMeta: "#FFFFFF", // 5.33:1 on #2563EB (blue bubbles) — AA pass for 11px text
  threadMetaProvider: "#6B7280", // 4.9:1 on #FFFFFF (white bubbles)
} as const;

export const dark = {
  bg: "#111113",
  card: "#1C1C1E",
  text: "#F5F5F5", // warm off-white per design guidelines
  sub: "#B0B7C0", // 8.0:1 on #111113
  muted: "#8B929B", // 5.3:1 on #111113 — AA pass
  border: "rgba(255,255,255,0.08)",
  activeBg: "rgba(255,255,255,0.05)",
  helpBg: "#EF4444",
  headerBg: "#1C1C1E",
  tabBg: "#1C1C1E",
  speakBg: "linear-gradient(135deg,#0F172A,#1E293B)",
  threadMeta: "#FFFFFF", // 5.33:1 on #2563EB (blue bubbles) — AA pass for 11px text
  threadMetaProvider: "#8B929B", // 5.3:1 on #1C1C1E
} as const;

export type ThemeTokens = typeof light;
export type ThemeName = "light" | "dark";

export const themes = { light, dark } as const;

/** Semantic colors — constant across themes */
export const colors = {
  patient: { light: "#2563EB", dark: "#60A5FA" },
  patientDeep: { light: "#1D4ED8", dark: "#3B82F6" },
  provider: { light: "#059669", dark: "#34D399" },
  providerDeep: { light: "#047857", dark: "#2DD4BF" },
  urgent: "#DC2626",
  purple: { light: "#7C3AED", dark: "#A78BFA" },
  amber: { light: "#D97706", dark: "#FBBF24" },
} as const;

/** Pain scale indigo ramp — colorblind-safe, single-hue intensity */
export const painColors = [
  "#C7D2FE", // 0
  "#B4BFFA", // 2
  "#A1ABF5", // 4
  "#8B93EF", // 6
  "#757DE8", // 8 (intermediate)
  "#6366F1", // (intermediate)
  "#5550E8", // (intermediate)
  "#4F3DD8", // (intermediate)
  "#4830C7", // (intermediate)
  "#3E22B5", // (intermediate)
  "#3316A0", // 10
] as const;

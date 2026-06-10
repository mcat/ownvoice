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
  sub: "#374151", // 10.04:1 on #FAFAF8 — AAA pass
  muted: "#4B5563", // 7.23:1 on #FAFAF8 — AAA pass
  border: "rgba(0,0,0,0.07)",
  activeBg: "rgba(0,0,0,0.03)",
  helpBg: "#DC2626",
  headerBg: "#FFFFFF",
  tabBg: "#FFFFFF",
  speakBg: "linear-gradient(135deg,#1E293B,#334155)",
  threadMeta: "#FFFFFF", // 5.33:1 on #2563EB (blue bubbles) — AA pass for 11px text
  threadMetaProvider: "#4B5563", // 7.23:1 on #FFFFFF (white bubbles) — AAA pass
} as const;

export const dark = {
  bg: "#111113",
  card: "#1C1C1E",
  text: "#F5F5F5", // warm off-white per design guidelines
  sub: "#B0B7C0", // 8.0:1 on #111113 — AAA pass
  muted: "#A0A7B0", // 7.1:1 on #111113 — AAA pass
  border: "rgba(255,255,255,0.08)",
  activeBg: "rgba(255,255,255,0.05)",
  helpBg: "#EF4444",
  headerBg: "#1C1C1E",
  tabBg: "#1C1C1E",
  speakBg: "linear-gradient(135deg,#0F172A,#1E293B)",
  threadMeta: "#FFFFFF", // 5.33:1 on #2563EB (blue bubbles) — AA pass for 11px text
  threadMetaProvider: "#A0A7B0", // 7.0:1 on #1C1C1E — AAA pass
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

export { z } from "./z";
export type { ZToken } from "./z";

/**
 * Pain tile BORDER ramp, per theme — same indigo family as painColors,
 * luminance-compressed so every step meets WCAG 1.4.11's 3:1 non-text
 * floor against that theme's card background (the 3px border is the only
 * boundary between a tile and the card). painColors itself stays the
 * shared fill/badge ramp; at its extremes it falls below 3:1 (light end
 * vs white, dark end vs #1C1C1E), which is exactly the range a patient
 * most needs to discriminate.
 *
 * Verified ratios (see tokens.test.ts, which recomputes them):
 *   light: 3.16:1 (index 0) … 11.91:1 (index 10) vs #FFFFFF
 *   dark:  11.41:1 (index 0) … 3.24:1 (index 10) vs #1C1C1E
 */
export const painBorderColors = {
  light: [
    "#7C87F6", "#757CED", "#6D70E5", "#6665DC", "#5F5AD4", "#584FCB",
    "#5043C2", "#4938BA", "#422DB1", "#3A21A9", "#3316A0",
  ],
  dark: [
    "#C7D2FE", "#BDC6FA", "#B2BAF6", "#A8AFF3", "#9DA3EF", "#9397EB",
    "#888BE7", "#7E7FE3", "#7374E0", "#6968DC", "#5E5CD8",
  ],
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

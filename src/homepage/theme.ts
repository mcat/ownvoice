/**
 * Design tokens for the homepage entry (/ and /research).
 *
 * Lives separate from `src/theme/` (the app's theme module) because the
 * homepage uses different typography (system sans, not Atkinson Hyperlegible)
 * and a different color palette (stone neutrals + slate accent for an
 * editorial reading experience). Bundle separation per Plan B means the
 * homepage entry must not import from src/theme/.
 */
export const homepageTheme = {
  font: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  color: {
    bg: "#ffffff",
    surface: "#fafaf8",
    text: "#0f172a",
    body: "#44403c",
    muted: "#78716c",
    border: "#e7e5e4",
    accent: "#0f172a",
    heroBg: "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)",
    heroText: "#ffffff",
    heroSubdued: "#cbd5e1",
  },
  radius: 6,
  maxWidth: 880,
  bodyMaxWidth: 680,
  bodyFontSize: 16,
  bodyLineHeight: 1.55,
  sectionPadding: "48px 32px",
} as const;

export type HomepageTheme = typeof homepageTheme;

/**
 * Z-index scale for overlays. Ordering rationale:
 *   - sheet:        default bottom-sheet layer (MyWishes, ProviderPanel).
 *   - sheetStacked: for a sheet layered on top of another (SettingsPanel opened
 *                   after a PIN unlock that temporarily overlaps).
 *   - pin:          the centered PinGate dialog — sits above sheets so the PIN
 *                   prompt is never visually buried.
 *   - speaking:     the "now speaking" status bar. Sits above sheets/pin so the
 *                   system's current speech state is never obscured by a
 *                   patient- or clinician-facing overlay.
 *   - setup:        first-run wizard, renders before the app exists.
 */
export const z = {
  sheet: 1000,
  sheetStacked: 1100,
  pin: 1200,
  speaking: 1250,
  toast: 1275,
  setup: 1300,
} as const;

export type ZToken = typeof z[keyof typeof z];

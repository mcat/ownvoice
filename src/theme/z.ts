/**
 * Z-index scale for overlays. Ordering rationale:
 *   - speaking: a passive "now speaking" toast; sits below interactive UI.
 *   - sheet:        default bottom-sheet layer (MyWishes, ProviderPanel, ListenPanel).
 *   - sheetStacked: for a sheet layered on top of another (SettingsPanel opened
 *                   after a PIN unlock that temporarily overlaps).
 *   - pin:          the centered PinGate dialog — sits above sheets so the PIN
 *                   prompt is never visually buried.
 *   - setup:        first-run wizard, renders before the app exists.
 */
export const z = {
  speaking: 100,
  sheet: 1000,
  sheetStacked: 1100,
  pin: 1200,
  setup: 1300,
} as const;

export type ZToken = typeof z[keyof typeof z];

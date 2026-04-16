/** Time-of-day icon for the Quick tab header */
export function getTimeIcon(): string {
  const hr = new Date().getHours();
  if (hr < 12) return "\uD83C\uDF05";
  if (hr < 17) return "\u2600\uFE0F";
  return "\uD83C\uDF19";
}

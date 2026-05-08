/** SHA-256 hash of the patient id, truncated to 16 hex chars (64 bits).
 *  Stable across sessions; raw uuid never enters the audit log. */
export async function patientIdHash(patientId: string): Promise<string> {
  const enc = new TextEncoder().encode(patientId);
  const buf = await crypto.subtle.digest("SHA-256", enc);
  const arr = new Uint8Array(buf);
  let hex = "";
  for (let i = 0; i < 8; i++) {
    hex += arr[i].toString(16).padStart(2, "0");
  }
  return hex;
}

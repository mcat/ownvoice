/**
 * Live ring buffer of recent `speak()` outcomes for the Diagnostics surface.
 *
 * Distinct from the audit logger (which is for export bundles). This ring is:
 *   - small (20 entries) and cheap (in-memory only — no IDB, no OPFS)
 *   - subscribe-able from Preact components for live updates
 *   - cleared on reload (the audit log persists; this doesn't)
 *
 * Emits one entry per completed `speak()` call, regardless of engine
 * (memory hot cache / OPFS cache / Web Speech / confirmation tone). The
 * Diagnostics panel renders these so a clinician asking "is the clone
 * actually being used?" can answer at a glance.
 */

export type EngineKind = "memory" | "cache" | "webspeech" | "tone";

export interface EngineOutcome {
  /** When the outcome was recorded (ms since epoch). */
  ts: number;
  /** Which path inside `speak()` resolved this utterance. */
  engine: EngineKind;
  /** First N chars of the spoken text (truncated to keep ring footprint small). */
  text: string;
  /** BCP-47 locale, or null when speak() didn't carry one (rare). */
  lang: string | null;
  /** Patient vs provider — useful when triaging "wrong voice spoke" reports. */
  actor: "patient" | "provider";
}

const RING_SIZE = 20;
const TEXT_MAX = 80;

let ring: EngineOutcome[] = [];
const subscribers = new Set<(snapshot: readonly EngineOutcome[]) => void>();

function notify(): void {
  // Snapshot once so all subscribers see the same slice.
  const snap = ring.slice();
  for (const cb of subscribers) {
    try {
      cb(snap);
    } catch {
      // A misbehaving subscriber must not break the ring.
    }
  }
}

/**
 * Append an outcome. Truncates the text and trims the ring to RING_SIZE.
 * Called from `speak.ts` immediately after each engine-outcome audit log.
 */
export function recordOutcome(outcome: Omit<EngineOutcome, "text"> & { text: string }): void {
  const trimmed: EngineOutcome = {
    ...outcome,
    text: outcome.text.length > TEXT_MAX ? outcome.text.slice(0, TEXT_MAX) + "…" : outcome.text,
  };
  ring.push(trimmed);
  if (ring.length > RING_SIZE) ring = ring.slice(-RING_SIZE);
  notify();
}

/**
 * Subscribe to ring updates. Returns an unsubscribe function. The callback
 * is NOT invoked synchronously on subscribe — call `getOutcomes()` first
 * if you need the current snapshot.
 */
export function subscribeOutcomes(
  cb: (snapshot: readonly EngineOutcome[]) => void,
): () => void {
  subscribers.add(cb);
  return () => {
    subscribers.delete(cb);
  };
}

/** Current snapshot, oldest-first. */
export function getOutcomes(): readonly EngineOutcome[] {
  return ring;
}

/** Test-only — drop everything and notify subscribers. */
export function clearOutcomes(): void {
  ring = [];
  notify();
}

import { useEffect, useState, useMemo } from "preact/hooks";
import { subscribe } from "./logger";
import { openAuditDb } from "./db";
import { patientIdHash } from "./hash";
import { ATTR } from "./attrs";
import { EVENT } from "./events";
import type { AuditRecord } from "./types";
import { useSettingsStore } from "../stores/settingsStore";

export interface ThreadEntry {
  id: string;
  from: "patient" | "provider";
  text: string;
  gloss?: string;
  icon?: string;
  time: number;
  label: string;
  /** PhraseKey of the originating phrase tap (absent for free text).
   *  Consumed by the suggestion trees to match provider questions
   *  exactly across locales. */
  key?: string;
}

const THREAD_VISIBLE: ReadonlySet<string> = new Set([
  EVENT.SPEAK_TAP,
  EVENT.THREAD_COMPOSE,
]);

/** Maximum entries held in memory for the live thread view. A long ICU
 *  session can produce thousands of taps; without a cap the array grows
 *  without bound (each ThreadEntry is ~hundreds of bytes, but the
 *  cumulative heap cost matters for an iPad held over a multi-hour
 *  shift). Older events stay in the audit IDB and remain queryable via
 *  export; the cap only narrows the in-memory window. 500 entries is
 *  generous (≈ a full caregiver shift of dense use) while keeping the
 *  in-memory footprint well under 1 MB. */
export const THREAD_VIEW_CAP = 500;

/** Pure helper: trim a list to the most-recent `cap` entries.
 *  Exported so the cap invariant can be unit-tested without driving the
 *  full IDB-cursor + subscribe path of useThreadView, which is fragile
 *  to seed reliably under fake-indexeddb at the 500-entry scale. */
export function capToWindow<T>(entries: readonly T[], cap: number): readonly T[] {
  return entries.length > cap ? entries.slice(-cap) : entries;
}

/** Exported for direct unit testing — the live-subscribe hook around it
 *  needs fake-indexeddb and has a history of CI flake (#351). */
export function recordToEntry(r: AuditRecord, patientName: string): ThreadEntry {
  const actor = r.attributes[ATTR.ACTOR] as "patient" | "provider" | undefined;
  const from: "patient" | "provider" =
    actor === "provider" ? "provider" : "patient";
  // SPEAK_TAP logs the key as "" for free text — normalize to undefined.
  const phraseKey = r.attributes[ATTR.SPEECH_PHRASE_KEY] as string | undefined;
  return {
    id: r.id,
    from,
    text: (r.attributes[ATTR.SPEECH_TEXT] as string | undefined) ?? "",
    gloss: r.attributes[ATTR.SPEECH_GLOSS] as string | undefined,
    icon: r.attributes[ATTR.SPEECH_ICON] as string | undefined,
    time: r.time,
    label:
      from === "provider"
        ? ((r.attributes[ATTR.PROVIDER_NAME] as string | undefined) ??
          "Care Team")
        : patientName,
    key: phraseKey || undefined,
  };
}

export function useThreadView(
  patientId: string | null,
): readonly ThreadEntry[] {
  const [entries, setEntries] = useState<readonly ThreadEntry[]>([]);
  const patient = useSettingsStore((s) =>
    patientId ? s.cfg?.patients.find((p) => p.id === patientId) : undefined,
  );
  const patientName = patient?.name ?? "";

  useEffect(() => {
    if (!patientId) {
      setEntries([]);
      return;
    }

    let cancelled = false;
    let hash: string | null = null;
    const initial: ThreadEntry[] = [];

    void (async () => {
      hash = await patientIdHash(patientId);
      const db = await openAuditDb();
      await new Promise<void>((res) => {
        const tx = db.transaction("events", "readonly");
        const idx = tx.objectStore("events").index("by_patient_time");
        const cursor = idx.openCursor(
          IDBKeyRange.bound([hash!, -Infinity], [hash!, Infinity]),
        );
        cursor.onsuccess = () => {
          const c = cursor.result;
          if (c) {
            const rec = c.value as AuditRecord;
            if (THREAD_VISIBLE.has(rec.name)) {
              initial.push(recordToEntry(rec, patientName));
            }
            c.continue();
          }
        };
        tx.oncomplete = () => res();
      });
      db.close();
      if (!cancelled) {
        // Index is ascending by time, so the most recent entries sit at
        // the end — capToWindow slices from there.
        setEntries(capToWindow(initial, THREAD_VIEW_CAP) as ThreadEntry[]);
      }
    })();

    const unsub = subscribe((rec) => {
      if (!hash || rec.patient_id_hash !== hash) return;
      if (!THREAD_VISIBLE.has(rec.name)) return;
      setEntries((prev) =>
        capToWindow(
          [...prev, recordToEntry(rec, patientName)],
          THREAD_VIEW_CAP,
        ) as ThreadEntry[],
      );
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [patientId, patientName]);

  return useMemo(() => entries, [entries]);
}

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
}

const THREAD_VISIBLE: ReadonlySet<string> = new Set([
  EVENT.SPEAK_TAP,
  EVENT.THREAD_COMPOSE,
  EVENT.THREAD_TRANSCRIBED,
]);

function recordToEntry(r: AuditRecord, patientName: string): ThreadEntry {
  const actor = r.attributes[ATTR.ACTOR] as "patient" | "provider" | undefined;
  const from: "patient" | "provider" =
    actor === "provider" ? "provider" : "patient";
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
      if (!cancelled) setEntries(initial);
    })();

    const unsub = subscribe((rec) => {
      if (!hash || rec.patient_id_hash !== hash) return;
      if (!THREAD_VISIBLE.has(rec.name)) return;
      setEntries((prev) => [...prev, recordToEntry(rec, patientName)]);
    });

    return () => {
      cancelled = true;
      unsub();
    };
  }, [patientId, patientName]);

  return useMemo(() => entries, [entries]);
}

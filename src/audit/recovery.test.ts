import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import {
  sweepAbandonedWorkflows,
  resumeWorkflow,
  reconcileAbandonedWithSettings,
  type AbandonedWorkflow,
} from "./recovery";
import { _resetRegistryForTests, registerWorkflow } from "./registry";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { _resetForTests as resetLogger } from "./logger";
import { initAudit } from "./init";
import { resetSessionForTests } from "./session";
import { patientIdHash } from "./hash";
import { makeTestCfg } from "../test/makeCfg";
import type { SpeakerData } from "../models/types";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

async function seedWorkflow(status: "running" | "completed", started_at = 1000) {
  const db = await openAuditDb();
  await new Promise<void>((res) => {
    const tx = db.transaction("workflows", "readwrite");
    tx.objectStore("workflows").put({
      workflow_id: "wf-" + status + "-" + started_at,
      name: "voice_enrollment", status, started_at, attempt: 1, step_history: [],
    });
    tx.oncomplete = () => res();
  });
  db.close();
}

describe("sweepAbandonedWorkflows", () => {
  beforeEach(async () => {
    resetLogger();
    resetSessionForTests();
    _resetRegistryForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("returns workflows with status=running", async () => {
    await seedWorkflow("running", 100);
    await seedWorkflow("completed", 200);
    const found = await sweepAbandonedWorkflows();
    expect(found.map((w) => w.workflow_id)).toEqual(["wf-running-100"]);
  });

  it("classifies recoveryMode by name", async () => {
    await seedWorkflow("running", 100);
    const [w] = await sweepAbandonedWorkflows();
    expect(w.recoveryMode).toBe("prompt"); // voice_enrollment defaults to prompt
  });
});

describe("resumeWorkflow", () => {
  beforeEach(async () => {
    resetLogger();
    resetSessionForTests();
    _resetRegistryForTests();
    await clearDb();
    await initAudit({ activePatientId: null });
  });

  it("invokes the registered runner for the named workflow", async () => {
    let invoked = false;
    registerWorkflow("voice_enrollment", async () => { invoked = true; });
    await seedWorkflow("running", 100);
    await resumeWorkflow("wf-running-100");
    expect(invoked).toBe(true);
  });

  it("logs a warning and no-ops when no runner is registered", async () => {
    await seedWorkflow("running", 100);
    await expect(resumeWorkflow("wf-running-100")).resolves.toBeUndefined();
  });

  it("no-ops when workflow_id does not exist", async () => {
    await expect(resumeWorkflow("does-not-exist")).resolves.toBeUndefined();
  });
});

describe("reconcileAbandonedWithSettings (#226)", () => {
  // A SpeakerData stand-in — only its presence matters; reconciliation
  // doesn't crack open the bytes.
  const FAKE_SPEAKER = { fingerprint: "x" } as unknown as SpeakerData;

  function abandoned(
    overrides: Partial<AbandonedWorkflow> = {},
  ): AbandonedWorkflow {
    return {
      workflow_id: "wf-1",
      name: "voice_enrollment",
      recoveryMode: "prompt",
      patient_id_hash: undefined,
      ...overrides,
    };
  }

  it("filters out voice_enrollment for a patient who already has speakerData", async () => {
    const cfg = makeTestCfg({
      patient: { id: "p1", speakerData: FAKE_SPEAKER, hasVoice: true },
    });
    const hash = await patientIdHash("p1");
    const filtered = await reconcileAbandonedWithSettings(
      [abandoned({ patient_id_hash: hash })],
      cfg,
    );
    expect(filtered).toHaveLength(0);
  });

  it("keeps voice_enrollment when the matching patient has NO speakerData", async () => {
    const cfg = makeTestCfg({
      patient: { id: "p1", speakerData: null, hasVoice: false },
    });
    const hash = await patientIdHash("p1");
    const filtered = await reconcileAbandonedWithSettings(
      [abandoned({ patient_id_hash: hash })],
      cfg,
    );
    expect(filtered).toHaveLength(1);
  });

  it("keeps voice_enrollment when no patient hash matches (cross-device leftovers)", async () => {
    const cfg = makeTestCfg({
      patient: { id: "p1", speakerData: FAKE_SPEAKER, hasVoice: true },
    });
    const filtered = await reconcileAbandonedWithSettings(
      [abandoned({ patient_id_hash: "deadbeef" })],
      cfg,
    );
    expect(filtered).toHaveLength(1);
  });

  it("keeps voice_enrollment rows that have no patient_id_hash at all", async () => {
    const cfg = makeTestCfg({
      patient: { id: "p1", speakerData: FAKE_SPEAKER, hasVoice: true },
    });
    const filtered = await reconcileAbandonedWithSettings(
      [abandoned({ patient_id_hash: undefined })],
      cfg,
    );
    expect(filtered).toHaveLength(1);
  });

  it("does NOT filter audio_cache_pregen rows (only voice_enrollment is reconciled here)", async () => {
    const cfg = makeTestCfg({
      patient: { id: "p1", speakerData: FAKE_SPEAKER, hasVoice: true },
    });
    const hash = await patientIdHash("p1");
    const filtered = await reconcileAbandonedWithSettings(
      [
        abandoned({
          name: "audio_cache_pregen",
          recoveryMode: "auto",
          patient_id_hash: hash,
        }),
      ],
      cfg,
    );
    expect(filtered).toHaveLength(1);
  });

  it("returns an empty array unchanged without doing any hashing work", async () => {
    const cfg = makeTestCfg();
    const filtered = await reconcileAbandonedWithSettings([], cfg);
    expect(filtered).toEqual([]);
  });

  it("filters one stale row but keeps a sibling for a different (un-enrolled) patient", async () => {
    // Patient p1 is enrolled; p2 isn't. Two abandoned voice_enrollment
    // rows — only the one for p1 should drop.
    const cfg = makeTestCfg({
      cfg: {
        patients: [
          { id: "p1", name: "Alice", bed: "1", patientLang: "en", hasVoice: true, speakerData: FAKE_SPEAKER },
          { id: "p2", name: "Bob", bed: "2", patientLang: "en", hasVoice: false, speakerData: null },
        ],
        activePatientId: "p1",
      },
    });
    const hashP1 = await patientIdHash("p1");
    const hashP2 = await patientIdHash("p2");
    const filtered = await reconcileAbandonedWithSettings(
      [
        abandoned({ workflow_id: "wf-p1", patient_id_hash: hashP1 }),
        abandoned({ workflow_id: "wf-p2", patient_id_hash: hashP2 }),
      ],
      cfg,
    );
    expect(filtered.map((w) => w.workflow_id)).toEqual(["wf-p2"]);
  });
});

import { describe, it, expect, beforeEach } from "vitest";
import "fake-indexeddb/auto";
import { initLogger, log, _resetForTests } from "./logger";
import { resetSessionForTests, setActivePatientHash } from "./session";
import { openAuditDb, AUDIT_DB_NAME } from "./db";
import { EVENT } from "./events";
import { ATTR } from "./attrs";

async function clearDb() {
  await new Promise<void>((res) => {
    const r = indexedDB.deleteDatabase(AUDIT_DB_NAME);
    r.onsuccess = r.onerror = r.onblocked = () => res();
  });
}

describe("logger tap-path latency", () => {
  beforeEach(async () => {
    _resetForTests();
    resetSessionForTests();
    await clearDb();
    const db = await openAuditDb();
    initLogger(db);
    setActivePatientHash("hashAAA");
  });

  it("p99 of synchronous log() < 5 ms over 1000 iterations", () => {
    const samples: number[] = [];
    for (let i = 0; i < 1000; i++) {
      const t0 = performance.now();
      log({
        name: EVENT.SPEAK_TAP,
        attributes: {
          [ATTR.SPEECH_TEXT]: "I'm in pain",
          [ATTR.ACTOR]: "patient",
          [ATTR.SPEECH_LANG]: "en",
        },
      });
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const p50 = samples[Math.floor(samples.length * 0.5)];
    const p99 = samples[Math.floor(samples.length * 0.99)];
    console.log(`logger p50=${p50.toFixed(3)}ms p99=${p99.toFixed(3)}ms`);
    expect(p50).toBeLessThan(1);
    expect(p99).toBeLessThan(5);
  });
});

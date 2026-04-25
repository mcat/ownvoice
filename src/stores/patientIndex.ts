/**
 * Per-patient metadata map for OPFS audio cache cleanup.
 * Single JSON file at audio-cache-v3/patient-index.json:
 *   { [patientId]: { fingerprint, hashes: string[] } }
 *
 * Loaded into memory on first access; debounced writes keep disk in sync.
 * Not Zustand — pure module-level state. Placed in src/stores/ only for
 * mutation-audit coverage.
 */

interface PatientEntry {
  fingerprint: string;
  hashes: string[]; // serialized as array; held in memory as Set for dedup
}

type IndexFile = Record<string, PatientEntry>;

const INDEX_PATH = ["audio-cache-v3", "patient-index.json"];
const WRITE_DEBOUNCE_MS = 500;

let memIndex: Map<
  string,
  { fingerprint: string; hashes: Set<string> }
> | null = null;
let pendingWrite: ReturnType<typeof setTimeout> | null = null;

async function getIndexFileHandle(): Promise<FileSystemFileHandle> {
  const root = await navigator.storage.getDirectory();
  const dir = await root.getDirectoryHandle(INDEX_PATH[0], { create: true });
  return dir.getFileHandle(INDEX_PATH[1], { create: true });
}

async function loadIndex(): Promise<void> {
  if (memIndex) return;
  memIndex = new Map();
  try {
    const handle = await getIndexFileHandle();
    const file = await handle.getFile();
    if (file.size === 0) return;
    const raw: IndexFile = JSON.parse(await file.text());
    for (const [pid, entry] of Object.entries(raw)) {
      memIndex.set(pid, {
        fingerprint: entry.fingerprint,
        hashes: new Set(entry.hashes ?? []),
      });
    }
  } catch (err) {
    console.warn("[patientIndex] failed to load:", err);
    memIndex = new Map();
  }
}

function scheduleWrite(): void {
  if (pendingWrite) clearTimeout(pendingWrite);
  pendingWrite = setTimeout(flushWrite, WRITE_DEBOUNCE_MS);
}

async function flushWrite(): Promise<void> {
  pendingWrite = null;
  if (!memIndex) return;
  const out: IndexFile = {};
  for (const [pid, entry] of memIndex) {
    out[pid] = {
      fingerprint: entry.fingerprint,
      hashes: Array.from(entry.hashes),
    };
  }
  try {
    const handle = await getIndexFileHandle();
    const w = await handle.createWritable();
    await w.write(JSON.stringify(out));
    await w.close();
  } catch (err) {
    console.error("[patientIndex] write failed:", err);
  }
}

export async function setFingerprint(
  patientId: string,
  fingerprint: string,
): Promise<void> {
  await loadIndex();
  const existing = memIndex!.get(patientId);
  memIndex!.set(patientId, {
    fingerprint,
    hashes: existing?.hashes ?? new Set(),
  });
  scheduleWrite();
}

export async function getFingerprint(
  patientId: string,
): Promise<string | null> {
  await loadIndex();
  return memIndex!.get(patientId)?.fingerprint ?? null;
}

export async function recordHash(
  patientId: string,
  hash: string,
): Promise<void> {
  await loadIndex();
  const entry = memIndex!.get(patientId);
  if (!entry) return; // unknown patient — silently drop (fingerprint must be set first)
  entry.hashes.add(hash);
  scheduleWrite();
}

export async function getPatientHashes(
  patientId: string,
): Promise<Set<string>> {
  await loadIndex();
  return new Set(memIndex!.get(patientId)?.hashes ?? []);
}

export async function removePatientHashes(
  patientId: string,
): Promise<Set<string>> {
  await loadIndex();
  const entry = memIndex!.get(patientId);
  if (!entry) return new Set();
  const hashes = new Set(entry.hashes);
  memIndex!.delete(patientId);
  await flushWrite(); // force immediate sync on destructive action
  return hashes;
}

/**
 * Union of every patient's tracked hashes — used by scoped resets to
 * decide which audio entries belong to "patients" vs "everything else".
 * Provider audio is intentionally never recorded in this index.
 */
export async function getAllPatientHashes(): Promise<Set<string>> {
  await loadIndex();
  const all = new Set<string>();
  for (const entry of memIndex!.values()) {
    for (const h of entry.hashes) all.add(h);
  }
  return all;
}

export async function clearIndex(): Promise<void> {
  memIndex = new Map();
  if (pendingWrite) {
    clearTimeout(pendingWrite);
    pendingWrite = null;
  }
  try {
    const handle = await getIndexFileHandle();
    const w = await handle.createWritable();
    await w.write("{}");
    await w.close();
  } catch {
    // Test environments may not have OPFS
  }
}

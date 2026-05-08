/** Crockford base32 alphabet — excludes I/L/O/U to avoid ambiguity. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

function encodeTime(ms: number): string {
  let t = ms;
  let out = "";
  for (let i = 0; i < 10; i++) {
    const mod = t % 32;
    out = ALPHABET[mod] + out;
    t = Math.floor(t / 32);
  }
  return out;
}

function encodeRandom(): string {
  const bytes = new Uint8Array(10);
  crypto.getRandomValues(bytes);
  let out = "";
  for (let i = 0; i < 16; i++) {
    // 16 base32 chars from 80 bits
    const byteIdx = (i * 5) >> 3;
    const bitOffset = (i * 5) & 7;
    const high = bytes[byteIdx] ?? 0;
    const low = bytes[byteIdx + 1] ?? 0;
    const combined = ((high << 8) | low) >> (11 - bitOffset);
    out += ALPHABET[combined & 31];
  }
  return out;
}

/** Generate a ULID for the current time. */
export function ulid(): string {
  return encodeTime(Date.now()) + encodeRandom();
}

/** Generate a ULID for a specific epoch-ms timestamp.
 *  Use for retention range bounds: any record whose id is < ulidForTime(cutoff)
 *  was emitted before cutoff. */
export function ulidForTime(epochMs: number): string {
  return encodeTime(epochMs) + encodeRandom();
}

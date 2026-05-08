function randomHex(bytes: number): string {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  let out = "";
  for (let i = 0; i < bytes; i++) out += arr[i].toString(16).padStart(2, "0");
  return out;
}

export function traceId(): string {
  return randomHex(16);
}
export function spanId(): string {
  return randomHex(8);
}

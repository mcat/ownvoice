/**
 * Stream a URL into an ArrayBuffer, calling `onProgress` once per
 * network chunk so the caller can post progress events in whatever
 * shape it wants. A first `onProgress(0, total)` event fires after
 * headers arrive but before any body bytes — gives callers like
 * ttsWorker's encoder fetch a chance to switch the UI into a loading
 * state with the real total before the first chunk lands.
 *
 * Throws on non-2xx status or a missing response body.
 */
export async function streamWithProgress(
  url: string,
  onProgress?: (loaded: number, total: number) => void,
): Promise<ArrayBuffer> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  const total = Number(response.headers.get("content-length")) || 0;
  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response body");

  onProgress?.(0, total);

  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    onProgress?.(loaded, total);
  }

  const combined = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return combined.buffer as ArrayBuffer;
}

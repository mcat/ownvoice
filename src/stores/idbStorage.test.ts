import { createIDBStorage, createDebouncedIDBStorage } from "./idbStorage";

describe("createIDBStorage", () => {
  const storage = createIDBStorage();

  it("getItem returns null for a missing key", async () => {
    const result = await storage.getItem("nonexistent-key");
    expect(result).toBeNull();
  });

  it("setItem + getItem round-trips a string", async () => {
    await storage.setItem("test-key", "hello world");
    const result = await storage.getItem("test-key");
    expect(result).toBe("hello world");
  });

  it("removeItem deletes the key", async () => {
    await storage.setItem("delete-me", "value");
    expect(await storage.getItem("delete-me")).toBe("value");

    await storage.removeItem("delete-me");
    expect(await storage.getItem("delete-me")).toBeNull();
  });

  it("setItem overwrites an existing key", async () => {
    await storage.setItem("overwrite", "first");
    await storage.setItem("overwrite", "second");
    expect(await storage.getItem("overwrite")).toBe("second");
  });
});

describe("createDebouncedIDBStorage", () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("does not write before the delay elapses", async () => {
    const storage = createDebouncedIDBStorage(500);
    const reader = createIDBStorage();
    const key = "debounce-not-written";

    // Start the debounced write (don't await — it won't resolve until timer fires)
    storage.setItem(key, "value");

    // Advance partway — not enough for the 500ms debounce
    vi.advanceTimersByTime(200);
    // Allow any IDB microtasks to flush
    await new Promise((r) => setTimeout(r, 0));

    expect(await reader.getItem(key)).toBeNull();
  });

  it("writes after the debounce delay", async () => {
    const storage = createDebouncedIDBStorage(500);
    const reader = createIDBStorage();
    const key = "debounce-written";

    const writePromise = storage.setItem(key, "final");

    // Advance past the debounce
    vi.advanceTimersByTime(500);
    await writePromise;

    expect(await reader.getItem(key)).toBe("final");
  });

  it("multiple rapid setItem calls result in a single write of the last value", async () => {
    const storage = createDebouncedIDBStorage(500);
    const reader = createIDBStorage();
    const key = "debounce-coalesced";

    // Fire three rapid writes; only the last should persist
    storage.setItem(key, "first");
    vi.advanceTimersByTime(100);

    storage.setItem(key, "second");
    vi.advanceTimersByTime(100);

    const lastWrite = storage.setItem(key, "third");

    // Not yet — only 0ms since the last call
    vi.advanceTimersByTime(200);
    await new Promise((r) => setTimeout(r, 0));
    expect(await reader.getItem(key)).toBeNull();

    // Advance to trigger the last debounce (500ms after the last setItem)
    vi.advanceTimersByTime(300);
    await lastWrite;

    expect(await reader.getItem(key)).toBe("third");
  });

  it("getItem reads directly without debounce", async () => {
    const writer = createIDBStorage();
    const storage = createDebouncedIDBStorage(500);

    await writer.setItem("direct-read", "instant");
    const result = await storage.getItem("direct-read");
    expect(result).toBe("instant");
  });

  it("removeItem deletes without debounce", async () => {
    const writer = createIDBStorage();
    const storage = createDebouncedIDBStorage(500);

    await writer.setItem("remove-test", "data");
    await storage.removeItem("remove-test");
    expect(await writer.getItem("remove-test")).toBeNull();
  });
});

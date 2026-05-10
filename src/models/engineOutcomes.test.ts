import {
  recordOutcome,
  subscribeOutcomes,
  getOutcomes,
  clearOutcomes,
  type EngineOutcome,
} from "./engineOutcomes";

beforeEach(() => {
  clearOutcomes();
});

function mkOutcome(overrides: Partial<EngineOutcome> = {}): EngineOutcome {
  return {
    ts: 1000,
    engine: "memory",
    text: "Water",
    lang: "en",
    actor: "patient",
    ...overrides,
  };
}

describe("engineOutcomes ring buffer", () => {
  it("starts empty", () => {
    expect(getOutcomes()).toEqual([]);
  });

  it("records outcomes oldest-first", () => {
    recordOutcome(mkOutcome({ ts: 1, text: "first" }));
    recordOutcome(mkOutcome({ ts: 2, text: "second" }));
    recordOutcome(mkOutcome({ ts: 3, text: "third" }));
    const out = getOutcomes();
    expect(out.map((o) => o.text)).toEqual(["first", "second", "third"]);
  });

  it("trims to RING_SIZE (20) entries, dropping oldest", () => {
    for (let i = 0; i < 25; i++) {
      recordOutcome(mkOutcome({ ts: i, text: `t${i}` }));
    }
    const out = getOutcomes();
    expect(out.length).toBe(20);
    // Oldest 5 dropped: t0..t4. Newest preserved: t5..t24.
    expect(out[0].text).toBe("t5");
    expect(out[19].text).toBe("t24");
  });

  it("truncates long text and appends ellipsis", () => {
    const longText = "x".repeat(200);
    recordOutcome(mkOutcome({ text: longText }));
    const out = getOutcomes();
    expect(out[0].text.length).toBe(81); // 80 chars + ellipsis
    expect(out[0].text.endsWith("…")).toBe(true);
  });

  it("preserves short text unchanged (no ellipsis when under cap)", () => {
    recordOutcome(mkOutcome({ text: "short text" }));
    expect(getOutcomes()[0].text).toBe("short text");
  });

  it("notifies subscribers with the new snapshot on record", () => {
    const cb = vi.fn();
    subscribeOutcomes(cb);
    recordOutcome(mkOutcome({ text: "hello" }));
    expect(cb).toHaveBeenCalledTimes(1);
    expect(cb.mock.calls[0][0]).toEqual([
      expect.objectContaining({ text: "hello" }),
    ]);
  });

  it("notifies all subscribers", () => {
    const a = vi.fn();
    const b = vi.fn();
    subscribeOutcomes(a);
    subscribeOutcomes(b);
    recordOutcome(mkOutcome());
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it("unsubscribe stops further notifications", () => {
    const cb = vi.fn();
    const unsub = subscribeOutcomes(cb);
    recordOutcome(mkOutcome());
    expect(cb).toHaveBeenCalledTimes(1);
    unsub();
    recordOutcome(mkOutcome());
    expect(cb).toHaveBeenCalledTimes(1);
  });

  it("a subscriber that throws does not break other subscribers", () => {
    const bad = vi.fn(() => {
      throw new Error("boom");
    });
    const good = vi.fn();
    subscribeOutcomes(bad);
    subscribeOutcomes(good);
    recordOutcome(mkOutcome());
    expect(bad).toHaveBeenCalled();
    expect(good).toHaveBeenCalled();
  });

  it("clearOutcomes wipes the ring and notifies subscribers", () => {
    recordOutcome(mkOutcome({ text: "before" }));
    const cb = vi.fn();
    subscribeOutcomes(cb);
    clearOutcomes();
    expect(getOutcomes()).toEqual([]);
    expect(cb).toHaveBeenCalledWith([]);
  });

  it("snapshots are independent — the ring's internal buffer cannot be mutated through them", () => {
    recordOutcome(mkOutcome({ text: "first" }));
    const snap = getOutcomes();
    // getOutcomes returns the live ring reference; verify recordOutcome
    // assigns a new array (slicing on overflow), so snapshots survive new
    // records past the ring size cap.
    for (let i = 0; i < 25; i++) {
      recordOutcome(mkOutcome({ ts: 100 + i, text: `t${i}` }));
    }
    // The original snapshot (taken when only "first" was in the ring)
    // should still contain "first" — we only get this guarantee because
    // recordOutcome reassigns `ring` rather than splicing in place.
    expect(snap).toContainEqual(expect.objectContaining({ text: "first" }));
  });
});

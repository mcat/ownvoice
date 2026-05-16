import { describe, it, expect } from "vitest";
import { truncate, safeStringify, formatArgs, MAX_ARG_CHARS } from "./logSink";

describe("truncate", () => {
  it("returns short strings unchanged", () => {
    expect(truncate("hello")).toBe("hello");
    expect(truncate("")).toBe("");
  });

  it("returns string at exactly the limit unchanged", () => {
    const s = "x".repeat(MAX_ARG_CHARS);
    expect(truncate(s)).toBe(s);
  });

  it("truncates strings over the limit and appends a marker with the dropped count", () => {
    const s = "a".repeat(MAX_ARG_CHARS + 500);
    const out = truncate(s);
    expect(out.startsWith("a".repeat(MAX_ARG_CHARS))).toBe(true);
    expect(out).toContain("…[+500 chars]");
  });
});

describe("safeStringify", () => {
  it("handles null and undefined", () => {
    expect(safeStringify(null)).toBe("null");
    expect(safeStringify(undefined)).toBe("undefined");
  });

  it("stringifies primitives", () => {
    expect(safeStringify("hello")).toBe("hello");
    expect(safeStringify(42)).toBe("42");
    expect(safeStringify(true)).toBe("true");
    expect(safeStringify(false)).toBe("false");
  });

  it("JSON-stringifies plain objects and arrays", () => {
    expect(safeStringify({ foo: "bar" })).toBe('{"foo":"bar"}');
    expect(safeStringify([1, 2, 3])).toBe("[1,2,3]");
  });

  it("uses Error.stack when given an Error", () => {
    const e = new Error("boom");
    const out = safeStringify(e);
    expect(out).toContain("Error");
    expect(out).toContain("boom");
  });

  it("falls back to String() on circular references", () => {
    const obj: { self?: unknown } = {};
    obj.self = obj;
    expect(safeStringify(obj)).toBe("[object Object]");
  });

  it("truncates long string inputs", () => {
    const s = "z".repeat(MAX_ARG_CHARS + 100);
    const out = safeStringify(s);
    expect(out).toContain("…[+100 chars]");
  });

  it("truncates long JSON output", () => {
    const longArr = Array.from({ length: 500 }, (_, i) => `item-${i}`);
    const out = safeStringify(longArr);
    expect(out.length).toBeLessThanOrEqual(MAX_ARG_CHARS + 30);
    expect(out).toContain("…[+");
  });
});

describe("formatArgs", () => {
  it("joins multiple args with single spaces", () => {
    expect(formatArgs(["a", "b", "c"])).toBe("a b c");
  });

  it("mixes primitives and objects", () => {
    expect(formatArgs([1, { x: 2 }, "end"])).toBe('1 {"x":2} end');
  });

  it("returns empty string for no args", () => {
    expect(formatArgs([])).toBe("");
  });

  it("handles a single Error arg by including its stack", () => {
    const out = formatArgs([new Error("kaboom")]);
    expect(out).toContain("kaboom");
  });
});

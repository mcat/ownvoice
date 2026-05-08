import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { FilterBar, type FilterBarValue } from "./FilterBar";

const PATIENTS = [
  { id: "p1", name: "Maria" },
  { id: "p2", name: "Lee" },
];

describe("FilterBar", () => {
  it("emits onChange when patient changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.change(screen.getByLabelText(/patient/i), { target: { value: "p1" } });
    expect(last?.patientId).toBe("p1");
  });

  it("emits onChange when date preset changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.change(screen.getByLabelText(/date/i), { target: { value: "last7d" } });
    expect(last?.datePreset).toBe("last7d");
  });

  it("emits onChange when severity changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.change(screen.getByLabelText(/severity/i), { target: { value: "13" } });
    expect(last?.minSeverity).toBe(13);
  });

  it("emits onChange when search changes", () => {
    let last: FilterBarValue | null = null;
    render(<FilterBar value={{ patientId: null, datePreset: "today", minSeverity: 9, search: "" }} patients={PATIENTS} onChange={(v) => { last = v; }} />);
    fireEvent.input(screen.getByLabelText(/search/i), { target: { value: "speak" } });
    expect(last?.search).toBe("speak");
  });
});

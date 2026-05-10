import { render, screen, fireEvent } from "@testing-library/preact";
import { light } from "../../theme/tokens";
import {
  recordOutcome,
  clearOutcomes,
} from "../../models/engineOutcomes";
import { EngineOutcomesPanel } from "./EngineOutcomesPanel";

beforeEach(() => {
  clearOutcomes();
});

describe("EngineOutcomesPanel", () => {
  it("shows an empty-state message when no outcomes have been recorded", () => {
    render(<EngineOutcomesPanel t={light} />);
    expect(screen.getByText(/No taps recorded yet/i)).toBeTruthy();
  });

  it("renders one row per outcome with a label, text, and time", async () => {
    render(<EngineOutcomesPanel t={light} />);
    recordOutcome({
      ts: Date.UTC(2026, 0, 1, 12, 34, 56),
      engine: "memory",
      text: "Water",
      lang: "en",
      actor: "patient",
    });
    // Subscriber wakes the component asynchronously via setState; getByText
    // does a microtask retry.
    expect(await screen.findByText("Water")).toBeTruthy();
    expect(await screen.findByText(/Voice clone \(memory\)/)).toBeTruthy();
  });

  it("renders newest-first", async () => {
    render(<EngineOutcomesPanel t={light} />);
    recordOutcome({
      ts: 1000,
      engine: "memory",
      text: "first",
      lang: "en",
      actor: "patient",
    });
    recordOutcome({
      ts: 2000,
      engine: "cache",
      text: "second",
      lang: "en",
      actor: "patient",
    });
    const rows = await screen.findAllByRole("listitem");
    expect(rows.length).toBe(2);
    // The first li in DOM order should be the newest record ("second").
    expect(rows[0].textContent).toContain("second");
    expect(rows[1].textContent).toContain("first");
  });

  it("uses distinct labels for each engine kind", async () => {
    render(<EngineOutcomesPanel t={light} />);
    recordOutcome({ ts: 1, engine: "memory", text: "m", lang: "en", actor: "patient" });
    recordOutcome({ ts: 2, engine: "cache", text: "c", lang: "en", actor: "patient" });
    recordOutcome({ ts: 3, engine: "webspeech", text: "w", lang: "en", actor: "patient" });
    recordOutcome({ ts: 4, engine: "tone", text: "t", lang: "en", actor: "patient" });
    expect(await screen.findByText(/Voice clone \(memory\)/)).toBeTruthy();
    expect(screen.getByText(/Voice clone \(disk\)/)).toBeTruthy();
    expect(screen.getByText(/Backup voice \(Web Speech\)/)).toBeTruthy();
    expect(screen.getByText(/Tone \(no speech available\)/)).toBeTruthy();
  });

  it("Clear button empties the panel back to the empty state", async () => {
    render(<EngineOutcomesPanel t={light} />);
    recordOutcome({
      ts: 1,
      engine: "memory",
      text: "Water",
      lang: "en",
      actor: "patient",
    });
    expect(await screen.findByText("Water")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Clear recent engine outcomes/i }));
    expect(await screen.findByText(/No taps recorded yet/i)).toBeTruthy();
  });

  it("marks provider taps with a stethoscope emoji", async () => {
    render(<EngineOutcomesPanel t={light} />);
    recordOutcome({
      ts: 1,
      engine: "memory",
      text: "patient hello",
      lang: "en",
      actor: "patient",
    });
    recordOutcome({
      ts: 2,
      engine: "memory",
      text: "provider hello",
      lang: "en",
      actor: "provider",
    });
    const rows = await screen.findAllByRole("listitem");
    // Newest-first: provider row is first.
    expect(rows[0].textContent).toContain("🩺");
    expect(rows[1].textContent).not.toContain("🩺");
  });
});

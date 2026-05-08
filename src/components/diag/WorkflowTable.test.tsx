import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { WorkflowTable } from "./WorkflowTable";
import type { WorkflowState } from "../../audit/types";

function makeWorkflow(overrides: Partial<WorkflowState> = {}): WorkflowState {
  return {
    workflow_id: "wf-1",
    name: "audio_cache_pregen",
    status: "completed",
    started_at: 1_000_000,
    ended_at: 1_001_500,
    attempt: 1,
    step_history: [
      {
        step_name: "synthesize",
        span_id: "span-a",
        attempt: 1,
        status: "completed",
        started_at: 1_000_000,
        ended_at: 1_000_900,
        result: "ok",
      },
    ],
    ...overrides,
  };
}

describe("WorkflowTable", () => {
  it("renders one row per workflow with status, name, duration", () => {
    render(<WorkflowTable workflows={[makeWorkflow()]} />);
    expect(screen.getByText("audio_cache_pregen")).toBeTruthy();
    expect(screen.getByText("completed")).toBeTruthy();
    expect(screen.getByText("1.5s")).toBeTruthy();
  });

  it("toggles step history on row expand", () => {
    render(<WorkflowTable workflows={[makeWorkflow()]} />);
    const toggle = screen.getByRole("button", { name: /toggle audio_cache_pregen details/i });
    expect(screen.queryAllByTestId("workflow-step").length).toBe(0);
    fireEvent.click(toggle);
    expect(screen.queryAllByTestId("workflow-step").length).toBe(1);
    fireEvent.click(toggle);
    expect(screen.queryAllByTestId("workflow-step").length).toBe(0);
  });

  it("shows error type and message when a failed workflow is expanded", () => {
    const wf = makeWorkflow({
      status: "failed",
      ended_at: 1_000_500,
      step_history: [{
        step_name: "synthesize",
        span_id: "span-a",
        attempt: 2,
        status: "failed",
        started_at: 1_000_000,
        ended_at: 1_000_400,
        error: { type: "ModelNotReady", message: "Decoder not initialized" },
      }],
    });
    render(<WorkflowTable workflows={[wf]} />);
    fireEvent.click(screen.getByRole("button", { name: /toggle audio_cache_pregen details/i }));
    const stepRow = screen.getByTestId("workflow-step");
    expect(stepRow.textContent ?? "").toContain("ModelNotReady");
    expect(stepRow.textContent ?? "").toContain("Decoder not initialized");
  });

  it("truncates long step result previews", () => {
    const huge = "x".repeat(5000);
    render(<WorkflowTable workflows={[makeWorkflow({
      step_history: [{
        step_name: "synthesize",
        span_id: "span-a",
        attempt: 1,
        status: "completed",
        started_at: 1_000_000,
        ended_at: 1_000_900,
        result: huge,
      }],
    })]} />);
    fireEvent.click(screen.getByRole("button", { name: /toggle/i }));
    const text = screen.getByText(/x{200}… \(\+4800 chars\)/);
    expect(text).toBeTruthy();
  });

  it("renders empty state when workflows list is empty", () => {
    render(<WorkflowTable workflows={[]} />);
    expect(screen.getByText(/no workflows match/i)).toBeTruthy();
  });

  it("shows 'running' duration for in-flight workflows", () => {
    render(<WorkflowTable workflows={[makeWorkflow({ status: "running", ended_at: undefined })]} />);
    // "running" appears twice for an in-flight workflow: once in the
    // status column and once in the duration column. Both reflect the
    // same underlying state so two matches is correct.
    expect(screen.getAllByText("running").length).toBe(2);
  });
});

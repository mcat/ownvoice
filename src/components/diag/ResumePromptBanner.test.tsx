import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/preact";
import { ResumePromptBanner } from "./ResumePromptBanner";
import { useUIStore } from "../../stores/uiStore";

describe("ResumePromptBanner", () => {
  beforeEach(() => {
    useUIStore.setState({ abandonedWorkflows: [] });
  });

  it("renders nothing when no abandoned workflows", () => {
    const { container } = render(<ResumePromptBanner />);
    expect(container.textContent).toBe("");
  });

  it("renders one banner per prompt-mode workflow", () => {
    useUIStore.getState().queueAbandonedWorkflow({
      workflow_id: "wf1",
      name: "voice_enrollment",
      recoveryMode: "prompt",
    });
    render(<ResumePromptBanner />);
    expect(screen.getByText(/voice enrollment/i)).toBeTruthy();
  });

  it("dismiss button removes the banner", () => {
    useUIStore.getState().queueAbandonedWorkflow({
      workflow_id: "wf1",
      name: "voice_enrollment",
      recoveryMode: "prompt",
    });
    render(<ResumePromptBanner />);
    fireEvent.click(screen.getByRole("button", { name: /discard/i }));
    expect(useUIStore.getState().abandonedWorkflows).toHaveLength(0);
  });

  it("ignores non-prompt-mode workflows", () => {
    useUIStore.getState().queueAbandonedWorkflow({
      workflow_id: "wf2",
      name: "audio_cache_pregen",
      recoveryMode: "auto",
    });
    const { container } = render(<ResumePromptBanner />);
    expect(container.textContent).toBe("");
  });
});

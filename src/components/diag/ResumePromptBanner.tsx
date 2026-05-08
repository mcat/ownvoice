import { useUIStore } from "../../stores/uiStore";
import { resumeWorkflow } from "../../audit/recovery";

const FRIENDLY: Record<string, string> = {
  voice_enrollment: "voice enrollment",
  audio_cache_pregen: "audio cache prep",
  model_priming: "model priming",
};

export function ResumePromptBanner() {
  const abandoned = useUIStore((s) => s.abandonedWorkflows);
  const dismiss = useUIStore((s) => s.dismissAbandonedWorkflow);

  const prompts = abandoned.filter((w) => w.recoveryMode === "prompt");
  if (prompts.length === 0) return null;

  return (
    <div
      role="alert"
      style={{
        background: "#fff3cd",
        borderBottom: "1px solid #ffeeba",
        padding: 12,
        fontSize: 14,
        display: "flex",
        flexDirection: "column",
        gap: 8,
      }}
    >
      {prompts.map((w) => (
        <div
          key={w.workflow_id}
          style={{ display: "flex", gap: 8, alignItems: "center" }}
        >
          <span style={{ flex: 1 }}>
            We didn't finish your {FRIENDLY[w.name] ?? w.name}. Resume?
          </span>
          <button
            onClick={async () => {
              await resumeWorkflow(w.workflow_id);
              dismiss(w.workflow_id);
            }}
          >
            Resume
          </button>
          <button onClick={() => dismiss(w.workflow_id)}>Discard</button>
        </div>
      ))}
    </div>
  );
}

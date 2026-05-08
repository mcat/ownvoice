import { useState } from "preact/hooks";
import { useSettingsStore } from "../stores/settingsStore";

export interface PinPromptProps {
  warning: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function PinPromptDialog({ warning, onConfirm, onCancel }: PinPromptProps) {
  const expectedPin = useSettingsStore((s) => s.cfg?.pin ?? "");
  const [entered, setEntered] = useState("");
  const [error, setError] = useState<string | null>(null);

  function handleConfirm() {
    if (entered === expectedPin) {
      onConfirm();
    } else {
      setError("Incorrect PIN.");
    }
  }

  return (
    <div role="dialog" aria-label="Confirm export" style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000,
    }}>
      <div style={{ background: "#fff", padding: 24, borderRadius: 8, maxWidth: 480, width: "90%" }}>
        <h2 style={{ marginTop: 0 }}>Confirm with PIN</h2>
        <p>{warning}</p>
        <label htmlFor="pin-prompt-input">PIN</label>
        <input
          id="pin-prompt-input"
          type="password"
          value={entered}
          onInput={(e) => { setEntered((e.target as HTMLInputElement).value); setError(null); }}
          style={{ display: "block", width: "100%", padding: 8, marginTop: 4, marginBottom: 8 }}
        />
        {error && <p role="alert" style={{ color: "#b00020" }}>{error}</p>}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleConfirm}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

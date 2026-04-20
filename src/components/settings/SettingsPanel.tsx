import { useState } from "preact/hooks";
import type { AppSettings, FallbackVoice } from "../../types";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { z } from "../../theme/z";
import { BottomSheet } from "../shared/BottomSheet";
import { PatientInfoSection } from "./sections/PatientInfoSection";
import { CareTeamSection } from "./sections/CareTeamSection";
import { AboutSection } from "./sections/AboutSection";
import { OfflineReadinessSection } from "./sections/OfflineReadinessSection";
import { ResetSection } from "./sections/ResetSection";

interface SettingsPanelProps {
  cfg: AppSettings;
  onUpdate: (cfg: AppSettings) => void;
  onReset: () => void | Promise<void>;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

export function SettingsPanel({
  cfg,
  onUpdate,
  onReset,
  onClose,
  t,
  theme,
}: SettingsPanelProps) {
  const [name, setName] = useState(cfg.patientName);
  const [bed, setBed] = useState(cfg.bed);
  const [patientVoice, setPatientVoice] = useState(cfg.patientVoice);
  const [fallbackVoice, setFallbackVoice] = useState<FallbackVoice | null>(
    cfg.fallbackVoice ?? null,
  );

  // Provider changes (add / remove / voice capture) commit directly to the
  // settings store from inside CareTeamSection, mirroring the patient's
  // immediate setSpeakerData path — so they don't participate in the
  // draft/save loop here.
  const hasChanges =
    name !== cfg.patientName ||
    bed !== cfg.bed ||
    patientVoice !== cfg.patientVoice ||
    (fallbackVoice?.voiceURI ?? null) !== (cfg.fallbackVoice?.voiceURI ?? null);

  function save() {
    onUpdate({ ...cfg, patientName: name, bed, patientVoice, fallbackVoice });
  }

  return (
    <BottomSheet onClose={onClose} t={t} zIndex={z.sheetStacked}>
      <BottomSheet.Header>
        <BottomSheet.Title>Settings</BottomSheet.Title>
        {/* "Done" text link instead of X — matches iPadOS convention for settings sheets. */}
        <BottomSheet.CloseButton
          aria-label="Close settings"
          style={{
            fontSize: 16,
            color: t.muted,
            padding: "8px 12px",
            minWidth: 64,
            minHeight: 64,
            fontFamily:
              "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
          }}
        >
          Done
        </BottomSheet.CloseButton>
      </BottomSheet.Header>

      <BottomSheet.Body>
        <div style={{ padding: "0 4px" }}>
          <PatientInfoSection
            cfg={cfg}
            name={name}
            bed={bed}
            patientVoice={patientVoice}
            fallbackVoice={fallbackVoice}
            hasChanges={hasChanges}
            onNameChange={setName}
            onBedChange={setBed}
            onPatientVoiceChange={setPatientVoice}
            onFallbackVoiceChange={setFallbackVoice}
            onSave={save}
            t={t}
            theme={theme}
          />
          <CareTeamSection
            cfg={cfg}
            t={t}
            theme={theme}
          />
          <AboutSection t={t} />
          <OfflineReadinessSection t={t} />
          <ResetSection onReset={onReset} t={t} theme={theme} />
        </div>
      </BottomSheet.Body>
    </BottomSheet>
  );
}

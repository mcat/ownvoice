import { useCallback, useState } from "preact/hooks";
import type { JSX } from "preact";
import { BottomSheet } from "../shared/BottomSheet";
import { KebabMenu } from "../shared/KebabMenu";
import { confirm } from "../shared/ConfirmDialog";
import { useStaffActivityBump } from "../../hooks/useStaffActivityBump";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { colors } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { useConversationStore } from "../../stores/conversationStore";
import { useAudioCacheStore } from "../../stores/audioCacheStore";
import { useUIStore } from "../../stores/uiStore";
import { removePatientHashes } from "../../stores/patientIndex";
import { LANGS } from "../../data/phrases";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import * as audioCacheRunner from "../../models/audioCacheRunner";
import type { Patient } from "../../types";

export interface PatientsScreenProps {
  open: boolean;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

/** Find the LANGS entry for a BCP 47 code. */
function langInfo(code: string) {
  return LANGS.find((l) => l.code === code);
}

/**
 * Combined patient roster surface: replaces SwitchSheet + PatientsSection.
 *
 * Each row is a plain <li> wrapping two interactive controls — a card-shaped
 * switch button and a trailing kebab menu. We don't reuse the listbox/option
 * pattern (as SwitchSheet did): nesting an interactive kebab button inside a
 * role="option" <li> would be nested-interactive (WCAG 4.1.2). Tab/Shift-Tab
 * walks between rows + kebabs; the kebab's own roving-tabindex handles
 * arrow-key nav within its menu.
 *
 * - Card button → switch to that patient (audioCacheRunner.pauseAll, bump
 *   lastActiveAt, queue onClose). Disabled when this is already the active
 *   patient.
 * - Kebab (⋯) → Edit / Remove menu.
 *   - Edit closes the screen first to avoid stacked sheets, then opens
 *     PatientEditSheet for that patient.
 *   - Remove disabled on the active patient with an inline hint.
 */
export function PatientsScreen({ open, onClose, t: tokens, theme }: PatientsScreenProps) {
  const bump = useStaffActivityBump();
  const cfg = useSettingsStore((s) => s.cfg);
  const caregiverLang = cfg?.caregiverLang ?? "en";
  const patients = cfg?.patients ?? [];
  const activePatientId = cfg?.activePatientId ?? null;
  const messagesByPatientId = useConversationStore((s) => s.messagesByPatientId);

  const sorted = [...patients].sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  const [announcement, setAnnouncement] = useState("");

  const handleSelect = useCallback(
    (patient: Patient) => {
      if (patient.id === activePatientId) return; // no-op
      audioCacheRunner.pauseAll();
      useSettingsStore.getState().switchPatient(patient.id);
      const messageCount = messagesByPatientId[patient.id]?.length ?? 0;
      const announcementText = resolvePhrase(
        "ui.provider.switch.switched_announcement",
        caregiverLang,
      )
        .replace("{name}", patient.name)
        .replace("{count}", String(messageCount));
      setAnnouncement(announcementText);
      // Allow the live region to update before closing.
      queueMicrotask(() => onClose());
    },
    [activePatientId, messagesByPatientId, caregiverLang, onClose],
  );

  const handleEdit = useCallback(
    (patient: Patient) => {
      // Close the Patients screen first so the edit sheet doesn't stack.
      onClose();
      useUIStore.getState().openPatientEdit(patient.id);
    },
    [onClose],
  );

  const handleRemove = useCallback(
    async (patient: Patient) => {
      const ok = await confirm({
        title: resolvePhrase("ui.provider.settings.patients.remove_dialog.title", caregiverLang)
          .replace("{name}", patient.name),
        body: resolvePhrase("ui.provider.settings.patients.remove_dialog.body", caregiverLang),
        confirmLabel: resolvePhrase("ui.provider.settings.patients.remove_dialog.confirm", caregiverLang),
        cancelLabel: resolvePhrase("ui.provider.pin_gate.cancel", caregiverLang),
        tone: "destructive",
      });
      if (!ok) return;
      try {
        useSettingsStore.getState().removePatient(patient.id);
        useConversationStore.getState().clearForPatient(patient.id);
        const hashes = await removePatientHashes(patient.id);
        try {
          const root = await navigator.storage.getDirectory();
          const dir = await root.getDirectoryHandle("audio-cache-v3").catch(() => null);
          if (dir) {
            for (const hash of hashes) {
              try { await dir.removeEntry(`${hash}.raw`); } catch { /* ok if missing */ }
            }
          }
        } catch {
          // OPFS not available (e.g. jsdom) — index hashes already cleared
        }
        useAudioCacheStore.getState().discardByPatientId(patient.id);
      } catch (err) {
        console.error("[PatientsScreen] remove failed:", err);
      }
    },
    [caregiverLang],
  );

  if (!open) return null;

  const isDark = theme === "dark";
  const patientColor = isDark ? colors.patient.dark : colors.patient.light;

  const addCardStyle: JSX.CSSProperties = {
    minHeight: 64,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: `2px dashed ${tokens.border}`,
    borderRadius: 12,
    marginBottom: 12,
    fontSize: 18,
    fontWeight: 600,
    fontFamily: "inherit",
    color: tokens.muted,
    background: tokens.activeBg,
    cursor: "pointer",
    padding: "12px 16px",
    width: "100%",
  };

  const listStyle: JSX.CSSProperties = {
    listStyle: "none",
    margin: 0,
    padding: 0,
    display: "flex",
    flexDirection: "column",
    gap: 8,
  };

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions
    <div onMouseDown={bump} onKeyDown={bump}>
      <BottomSheet onClose={onClose} t={tokens} heightVh={88}>
        <BottomSheet.Header>
          <BottomSheet.BackButton
            parentLabel={resolvePhrase("ui.provider.settings.title", caregiverLang)}
            onClick={() => {
              onClose();
              useUIStore.getState().openOverlay("settings");
            }}
          />
          <BottomSheet.Title>
            {resolvePhrase("ui.provider.patients.title", caregiverLang)}
          </BottomSheet.Title>
          <BottomSheet.CloseButton
            aria-label={resolvePhrase("ui.provider.settings.close_aria", caregiverLang)}
            style={{
              fontSize: 16,
              color: tokens.muted,
              padding: "8px 12px",
              minWidth: 64,
              minHeight: 64,
              fontFamily:
                "'Atkinson Hyperlegible Next', system-ui, -apple-system, sans-serif",
            }}
          >
            {resolvePhrase("ui.provider.settings.done", caregiverLang)}
          </BottomSheet.CloseButton>
        </BottomSheet.Header>
        <BottomSheet.Body>
          {/* + Add Patient card */}
          <button
            type="button"
            onClick={() => {
              onClose();
              useUIStore.getState().openOverlay("addPatient");
            }}
            style={addCardStyle}
          >
            {resolvePhrase("ui.provider.switch.add_patient", caregiverLang)}
          </button>

          {/* Patient list — plain list with two-button rows. */}
          <ul style={listStyle}>
            {sorted.map((patient) => {
              const isActive = patient.id === activePatientId;
              const lang = langInfo(patient.patientLang);

              const rowStyle: JSX.CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: 8,
                borderRadius: 12,
                border: isActive ? `2px solid ${patientColor}` : `1px solid ${tokens.border}`,
                boxShadow: isActive ? `0 0 0 2px ${patientColor}` : undefined,
                background: isActive ? tokens.activeBg : tokens.card,
                padding: "4px 4px 4px 0",
              };

              const cardButtonStyle: JSX.CSSProperties = {
                flex: 1,
                minHeight: 64,
                padding: "12px 16px",
                background: "transparent",
                border: "none",
                color: tokens.text,
                fontFamily: "inherit",
                textAlign: "start",
                cursor: isActive ? "default" : "pointer",
                opacity: isActive ? 0.85 : 1,
                display: "flex",
                flexDirection: "column",
                gap: 4,
                borderRadius: 10,
              };

              const nameStyle: JSX.CSSProperties = {
                fontSize: 20,
                fontWeight: 700,
                color: tokens.text,
                margin: 0,
                lineHeight: 1.3,
              };

              const metaStyle: JSX.CSSProperties = {
                fontSize: 14,
                color: tokens.sub,
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 8,
              };

              const ariaCardLabel = isActive
                ? `${patient.name} — ${resolvePhrase("ui.provider.switch.currently_active", caregiverLang)}`
                : patient.name;

              return (
                <li key={patient.id} style={rowStyle}>
                  <button
                    type="button"
                    onClick={() => handleSelect(patient)}
                    disabled={isActive}
                    aria-current={isActive ? "true" : undefined}
                    aria-label={ariaCardLabel}
                    style={cardButtonStyle}
                  >
                    <span style={nameStyle}>{patient.name}</span>
                    <span style={metaStyle}>
                      {patient.bed && <span>Bed {patient.bed}</span>}
                      {lang && (
                        <span>
                          {lang.flag} {lang.englishLabel}
                          {lang.englishLabel !== lang.label && ` (${lang.label})`}
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: 8,
                          background: patient.hasVoice ? patientColor : tokens.activeBg,
                          color: patient.hasVoice ? "#FFFFFF" : tokens.muted,
                        }}
                      >
                        {patient.hasVoice
                          ? resolvePhrase("ui.provider.switch.voice_captured", caregiverLang)
                          : resolvePhrase("ui.provider.switch.no_voice", caregiverLang)}
                      </span>
                    </span>
                  </button>

                  <KebabMenu
                    ariaLabel={resolvePhrase("ui.provider.patients.actions_aria", caregiverLang)
                      .replace("{name}", patient.name)}
                    t={tokens}
                    isDark={isDark}
                    items={[
                      {
                        label: resolvePhrase("ui.provider.patients.action_edit", caregiverLang),
                        onSelect: () => handleEdit(patient),
                      },
                      {
                        label: resolvePhrase("ui.provider.patients.action_remove", caregiverLang),
                        onSelect: () => handleRemove(patient),
                        tone: "destructive",
                        disabled: isActive,
                        disabledHint: isActive
                          ? resolvePhrase("ui.provider.settings.patients.active_remove_hint", caregiverLang)
                          : undefined,
                      },
                    ]}
                  />
                </li>
              );
            })}
          </ul>

          {/* Live region for switch announcements */}
          <div
            role="status"
            aria-live="polite"
            style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
          >
            {announcement}
          </div>
        </BottomSheet.Body>
      </BottomSheet>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from "preact/hooks";
import type { JSX } from "preact";
import { BottomSheet } from "../shared/BottomSheet";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { colors } from "../../theme/tokens";
import { useSettingsStore } from "../../stores/settingsStore";
import { useConversationStore } from "../../stores/conversationStore";
import { LANGS } from "../../data/phrases";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import * as audioCacheRunner from "../../models/audioCacheRunner";
import type { Patient } from "../../types";

export interface SwitchSheetProps {
  open: boolean;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
}

/** Format a relative-time label from a Unix-ms timestamp. */
function formatLastActive(ts: number, lang: string): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return resolvePhrase("ui.provider.switch.last_active_just_now", lang);
  if (mins < 60) {
    return resolvePhrase("ui.provider.switch.last_active_minutes", lang).replace("{n}", String(mins));
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    return resolvePhrase("ui.provider.switch.last_active_hours", lang).replace("{n}", String(hours));
  }
  const days = Math.floor(hours / 24);
  return resolvePhrase("ui.provider.switch.last_active_days", lang).replace("{n}", String(days));
}

/** Find the LANGS entry for a BCP 47 code. */
function langInfo(code: string) {
  return LANGS.find((l) => l.code === code);
}

export function SwitchSheet({ open, onClose, t: tokens, theme }: SwitchSheetProps) {
  const cfg = useSettingsStore((s) => s.cfg);
  const caregiverLang = cfg?.caregiverLang ?? "en";
  const patients = cfg?.patients ?? [];
  const activePatientId = cfg?.activePatientId ?? null;
  const messagesByPatientId = useConversationStore((s) => s.messagesByPatientId);

  // Sort patients by lastActiveAt descending
  const sorted = [...patients].sort((a, b) => b.lastActiveAt - a.lastActiveAt);

  // Keyboard navigation state — scoped to patient list only
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const itemRefs = useRef<(HTMLLIElement | null)[]>([]);

  // Announcement for screen readers
  const [announcement, setAnnouncement] = useState("");
  const addHintId = "switch-sheet-add-hint";

  useEffect(() => {
    if (focusedIndex >= 0 && focusedIndex < sorted.length) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [focusedIndex, sorted.length]);

  // Reset focused index when sheet opens
  useEffect(() => {
    if (open) {
      setFocusedIndex(-1);
      setAnnouncement("");
    }
  }, [open]);

  const handleSelect = useCallback(
    (patient: Patient) => {
      if (patient.id === activePatientId) return; // no-op for active patient
      audioCacheRunner.pauseAll();
      useSettingsStore.getState().switchPatient(patient.id);
      const messageCount = messagesByPatientId[patient.id]?.length ?? 0;
      const announcementText = resolvePhrase("ui.provider.switch.switched_announcement", caregiverLang)
        .replace("{name}", patient.name)
        .replace("{count}", String(messageCount));
      setAnnouncement(announcementText);
      // Allow live region to update before closing
      queueMicrotask(() => onClose());
    },
    [activePatientId, messagesByPatientId, caregiverLang, onClose],
  );

  const handleListKeyDown = useCallback(
    (e: JSX.TargetedKeyboardEvent<HTMLElement>) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setFocusedIndex((prev) => (prev < sorted.length - 1 ? prev + 1 : prev));
          break;
        case "ArrowUp":
          e.preventDefault();
          setFocusedIndex((prev) => (prev > 0 ? prev - 1 : prev));
          break;
        case "Home":
          e.preventDefault();
          setFocusedIndex(0);
          break;
        case "End":
          e.preventDefault();
          setFocusedIndex(sorted.length - 1);
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (focusedIndex >= 0 && focusedIndex < sorted.length) {
            handleSelect(sorted[focusedIndex]);
          }
          break;
      }
    },
    [sorted, focusedIndex, handleSelect],
  );

  if (!open) return null;

  const patientColor = theme === "dark" ? colors.patient.dark : colors.patient.light;
  const providerColor = theme === "dark" ? colors.provider.dark : colors.provider.light;

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
    cursor: "not-allowed",
    opacity: 0.6,
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
    <BottomSheet onClose={onClose} t={tokens} heightVh={88}>
      <BottomSheet.Header>
        <BottomSheet.Title>
          {resolvePhrase("ui.provider.switch.title", caregiverLang)}
        </BottomSheet.Title>
        <BottomSheet.CloseButton aria-label="Close" />
      </BottomSheet.Header>
      <BottomSheet.Body>
        {/* + Add Patient card — disabled for PR A */}
        <button
          type="button"
          disabled
          aria-describedby={addHintId}
          style={addCardStyle}
        >
          {resolvePhrase("ui.provider.switch.add_patient", caregiverLang)}
        </button>
        <span
          id={addHintId}
          style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}
        >
          {resolvePhrase("ui.provider.switch.add_patient_disabled_hint", caregiverLang)}
        </span>

        {/* Patient list */}
        {/* eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions */}
        <ul
          role="listbox"
          aria-label="Patients"
          style={listStyle}
          onKeyDown={handleListKeyDown}
        >
          {sorted.map((patient, i) => {
            const isActive = patient.id === activePatientId;
            const lang = langInfo(patient.patientLang);

            const cardStyle: JSX.CSSProperties = {
              minHeight: 64,
              display: "flex",
              flexDirection: "column",
              gap: 4,
              padding: "12px 16px",
              borderRadius: 12,
              border: isActive ? `2px solid ${patientColor}` : `1px solid ${tokens.border}`,
              boxShadow: isActive ? `0 0 0 2px ${patientColor}` : undefined,
              background: isActive ? tokens.activeBg : tokens.card,
              cursor: isActive ? "default" : "pointer",
              fontFamily: "inherit",
              textAlign: "left",
              width: "100%",
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

            const chipBase: JSX.CSSProperties = {
              fontSize: 12,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 8,
              display: "inline-block",
            };

            const voiceChipStyle: JSX.CSSProperties = {
              ...chipBase,
              background: patient.hasVoice ? providerColor : tokens.activeBg,
              color: patient.hasVoice ? "#FFFFFF" : tokens.muted,
            };

            return (
              <li
                key={patient.id}
                ref={(el) => { itemRefs.current[i] = el; }}
                role="option"
                aria-selected={isActive}
                aria-current={isActive ? "true" : undefined}
                tabIndex={focusedIndex === i ? 0 : -1}
                onClick={() => handleSelect(patient)}
                onKeyDown={(e: JSX.TargetedKeyboardEvent<HTMLLIElement>) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleSelect(patient);
                  }
                }}
                style={cardStyle}
              >
                <div style={nameStyle}>
                  {patient.name}
                  {isActive && (
                    <span style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clip: "rect(0,0,0,0)" }}>
                      {resolvePhrase("ui.provider.switch.currently_active", caregiverLang)}
                    </span>
                  )}
                </div>
                <div style={metaStyle}>
                  {patient.bed && <span>Bed {patient.bed}</span>}
                  {lang && <span>{lang.flag} {lang.label}</span>}
                  <span style={voiceChipStyle}>
                    {patient.hasVoice
                      ? resolvePhrase("ui.provider.switch.voice_captured", caregiverLang)
                      : resolvePhrase("ui.provider.switch.no_voice", caregiverLang)}
                  </span>
                  <span style={{ fontSize: 12, color: tokens.muted }}>
                    {formatLastActive(patient.lastActiveAt, caregiverLang)}
                  </span>
                </div>
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
  );
}

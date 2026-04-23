import { useState } from "preact/hooks";
import type { JSX } from "preact";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { getWishTopics, composeWishSentence, t as resolvePhrase } from "../../data/phraseRegistry";
import type { PhraseKey } from "../../data/phraseRegistry";
import { DualLocaleText } from "../shared/DualLocaleText";
import { useSettingsStore, useActivePatient } from "../../stores/settingsStore";
import { Btn } from "../shared/Btn";
import { BottomSheet } from "../shared/BottomSheet";

interface MyWishesProps {
  onSpeak: (text: string, opts?: { gloss?: string }) => void;
  locale?: string;
  onAddToThread: (
    text: string,
    from: "patient" | "provider",
    label?: string,
    gloss?: string,
  ) => void;
  onClose: () => void;
  t: ThemeTokens;
  theme: ThemeName;
  patientName: string;
}

export function MyWishes({
  onSpeak,
  onAddToThread,
  onClose,
  t,
  theme,
  patientName,
  locale = "en",
}: MyWishesProps) {
  const cfg = useSettingsStore((s) => s.cfg);
  const patientLang = useActivePatient()?.patientLang ?? "en";
  const caregiverLang = cfg?.caregiverLang ?? "en";
  const SICG_TOPICS = getWishTopics();
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, PhraseKey[]>>({});
  const [complete, setComplete] = useState(false);

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const blueBg = theme === "dark" ? "#1E3A5F" : "#EFF6FF";

  const topic = SICG_TOPICS[currentIdx];
  const selected = selections[topic?.id] ?? [];

  function toggleResponse(responseKey: PhraseKey) {
    const topicId = topic.id;
    const current = selections[topicId] ?? [];
    const idx = current.indexOf(responseKey);
    if (idx >= 0) {
      setSelections({
        ...selections,
        [topicId]: current.filter((r) => r !== responseKey),
      });
    } else {
      setSelections({ ...selections, [topicId]: [...current, responseKey] });
    }
  }

  function handleShare() {
    if (!selected.length) return;
    const sentence = composeWishSentence({ locale: patientLang, topicId: topic.id, selectedResponseKeys: selected });
    // Compose gloss in the opposite locale for thread dual-locale display
    const gloss = caregiverLang !== patientLang
      ? composeWishSentence({ locale: caregiverLang, topicId: topic.id, selectedResponseKeys: selected })
      : undefined;
    // The question is a provider-direction thread entry (shown in patient lang)
    const questionGloss = caregiverLang !== patientLang
      ? resolvePhrase(topic.questionKey, caregiverLang)
      : undefined;
    onAddToThread(
      resolvePhrase(topic.questionKey, patientLang),
      "provider",
      resolvePhrase("ui.patient.wishes.my_wishes", patientLang),
      questionGloss,
    );
    onSpeak(sentence, { gloss });
    advance();
  }

  function handleSkip() {
    advance();
  }

  function advance() {
    if (currentIdx < SICG_TOPICS.length - 1) {
      setCurrentIdx(currentIdx + 1);
    } else {
      setComplete(true);
    }
  }

  function handleShareAll() {
    for (const tp of SICG_TOPICS) {
      const sel = selections[tp.id];
      if (sel && sel.length > 0) {
        const sentence = composeWishSentence({ locale: patientLang, topicId: tp.id, selectedResponseKeys: sel });
        const gloss = caregiverLang !== patientLang
          ? composeWishSentence({ locale: caregiverLang, topicId: tp.id, selectedResponseKeys: sel })
          : undefined;
        onSpeak(sentence, { gloss });
      }
    }
  }

  const progressRow: JSX.CSSProperties = { display: "flex", gap: 6 };

  /* ── Completion screen ─────────────────────────────────── */

  if (complete) {
    const answeredTopics = SICG_TOPICS.filter(
      (tp) => selections[tp.id] && selections[tp.id].length > 0,
    );

    return (
      <BottomSheet onClose={onClose} t={t}>
        <BottomSheet.Header>
          <BottomSheet.Title>{resolvePhrase("ui.patient.wishes.completion_title", patientLang).replace("{name}", patientName)}</BottomSheet.Title>
          <BottomSheet.CloseButton aria-label={resolvePhrase("ui.patient.wishes.close", patientLang)} />
        </BottomSheet.Header>

        <BottomSheet.Body>
          {answeredTopics.length === 0 ? (
            <p
              style={{
                color: t.sub,
                fontSize: 18,
                textAlign: "center",
                marginTop: 40,
              }}
            >
              {resolvePhrase("ui.patient.wishes.none_shared", patientLang)}
            </p>
          ) : (
            answeredTopics.map((tp) => {
              const sentence = composeWishSentence({ locale: patientLang, topicId: tp.id, selectedResponseKeys: selections[tp.id] });
              return (
                <div
                  key={tp.id}
                  style={{
                    marginBottom: 16,
                    padding: 16,
                    borderRadius: 12,
                    backgroundColor: blueBg,
                  }}
                >
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 600,
                      color: t.text,
                      marginBottom: 6,
                    }}
                  >
                    {tp.icon}{" "}
                    <DualLocaleText variant="co-read" primaryKey={tp.labelKey} primaryLocale={patientLang} glossLocale={caregiverLang} style={{ display: "inline" }} />
                  </div>
                  <div style={{ fontSize: 18, color: t.text }}>{sentence}</div>
                </div>
              );
            })
          )}
        </BottomSheet.Body>

        <BottomSheet.Actions>
          {answeredTopics.length > 0 && (
            <Btn
              onClick={handleShareAll}
              style={{
                flex: 1,
                padding: "16px",
                borderRadius: 12,
                border: "none",
                fontSize: 18,
                fontWeight: 600,
                color: "#fff",
                backgroundColor: blue,
                minHeight: 64,
              }}
            >
              {resolvePhrase("ui.patient.wishes.share_all_again", patientLang)}
            </Btn>
          )}
          <Btn
            onClick={onClose}
            style={{
              flex: answeredTopics.length > 0 ? undefined : 1,
              padding: "16px 24px",
              borderRadius: 12,
              border: `2px solid ${t.border}`,
              fontSize: 18,
              fontWeight: 600,
              color: t.text,
              backgroundColor: t.card,
              minHeight: 64,
              minWidth: 64,
            }}
          >
            {resolvePhrase("ui.patient.wishes.close", patientLang)}
          </Btn>
        </BottomSheet.Actions>
      </BottomSheet>
    );
  }

  /* ── Active topic screen ───────────────────────────────── */

  return (
    <BottomSheet onClose={onClose} t={t}>
      <BottomSheet.Header>
        <BottomSheet.Title>{resolvePhrase("ui.patient.wishes.my_wishes", patientLang)}</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label={resolvePhrase("ui.patient.wishes.close", patientLang)} />
        <div style={{ flexBasis: "100%" }}>
          <div
            class="font-sans"
            style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}
          >
            {resolvePhrase("ui.patient.wishes.step_of", patientLang).replace("{n}", String(currentIdx + 1)).replace("{total}", String(SICG_TOPICS.length))}
          </div>
          <div style={progressRow}>
            {SICG_TOPICS.map((tp, i) => {
              const answered =
                selections[tp.id] && selections[tp.id].length > 0;
              let bg: string;
              if (i < currentIdx || answered) {
                bg = blue;
              } else if (i === currentIdx) {
                bg = "#93C5FD";
              } else {
                // 3:1 non-text contrast for WCAG 1.4.11 AA
                bg = theme === "dark" ? "rgba(255,255,255,0.30)" : "#6B7280";
              }
              return (
                <div
                  key={tp.id}
                  aria-current={i === currentIdx ? "step" : undefined}
                  style={{
                    flex: 1,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: bg,
                    transition: "background-color 0.3s",
                  }}
                />
              );
            })}
          </div>
        </div>
      </BottomSheet.Header>

      <BottomSheet.Body>
        {/* Topic header — question only; emoji & label are used on the
            completion screen, not here. */}
        <h2
          style={{
            marginTop: 16,
            marginBottom: 24,
            textAlign: "center",
            fontSize: 20,
            fontWeight: 600,
            color: t.text,
            lineHeight: 1.35,
          }}
        >
          <DualLocaleText variant="co-read" primaryKey={topic.questionKey} primaryLocale={patientLang} glossLocale={caregiverLang} />
        </h2>

        {/* Response buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {topic.responseKeys.map((rk) => {
            const isSelected = selected.includes(rk);

            return (
              <Btn
                key={rk}
                onClick={() => toggleResponse(rk)}
                aria-pressed={isSelected}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 12,
                  border: `2px solid ${isSelected ? blue : t.border}`,
                  backgroundColor: isSelected ? blueBg : t.card,
                  fontSize: 18,
                  color: t.text,
                  textAlign: "left",
                  minHeight: 64,
                }}
              >
                <div
                  aria-hidden="true"
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 16,
                    border: `2px solid ${isSelected ? blue : t.border}`,
                    backgroundColor: isSelected ? blue : "transparent",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 18,
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {isSelected ? "✓" : ""}
                </div>
                <DualLocaleText variant="co-read" primaryKey={rk} primaryLocale={patientLang} glossLocale={caregiverLang} />
              </Btn>
            );
          })}
        </div>
      </BottomSheet.Body>

      <BottomSheet.Actions>
        <Btn
          onClick={handleShare}
          disabled={selected.length === 0}
          style={{
            flex: 1,
            padding: "16px",
            borderRadius: 12,
            border: "none",
            fontSize: 18,
            fontWeight: 600,
            color: "#fff",
            backgroundColor:
              selected.length > 0
                ? blue
                : theme === "dark"
                  ? "#374151"
                  : "#D1D5DB",
            minHeight: 64,
            opacity: selected.length === 0 ? 0.6 : 1,
          }}
        >
          {resolvePhrase("ui.patient.wishes.share", patientLang)}
        </Btn>
        <Btn
          onClick={handleSkip}
          style={{
            padding: "16px 24px",
            borderRadius: 12,
            border: `2px solid ${t.border}`,
            fontSize: 18,
            fontWeight: 600,
            color: t.sub,
            backgroundColor: t.card,
            minHeight: 64,
            minWidth: 64,
          }}
        >
          {resolvePhrase("ui.patient.wishes.skip", patientLang)}
        </Btn>
      </BottomSheet.Actions>
    </BottomSheet>
  );
}

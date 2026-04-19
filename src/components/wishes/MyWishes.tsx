import { useState, useRef, useEffect } from "preact/hooks";
import type { JSX } from "preact";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { getWishTopics, composeWishSentence } from "../../data/phraseRegistry";
import { Btn } from "../shared/Btn";
import { BottomSheet } from "../shared/BottomSheet";

interface WishMessage {
  from: "patient" | "provider";
  text: string;
}

interface MyWishesProps {
  onSpeak: (text: string) => void;
  locale?: string;
  onAddToThread: (
    text: string,
    from: "patient" | "provider",
    label?: string,
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
  const SICG_TOPICS = getWishTopics(locale);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [thread, setThread] = useState<WishMessage[]>([]);
  const [complete, setComplete] = useState(false);

  const threadRef = useRef<HTMLDivElement>(null);

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const blueBg = theme === "dark" ? "#1E3A5F" : "#EFF6FF";

  const topic = SICG_TOPICS[currentIdx];
  const selected = selections[topic?.id] ?? [];

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight;
    }
  }, [thread.length]);

  function toggleResponse(response: string) {
    const topicId = topic.id;
    const current = selections[topicId] ?? [];
    const idx = current.indexOf(response);
    if (idx >= 0) {
      setSelections({
        ...selections,
        [topicId]: current.filter((r) => r !== response),
      });
    } else {
      setSelections({ ...selections, [topicId]: [...current, response] });
    }
  }

  function handleShare() {
    if (!selected.length) return;
    const sentence = composeWishSentence(locale, topic, selected);
    setThread((prev) => [
      ...prev,
      { from: "provider", text: topic.question },
      { from: "patient", text: sentence },
    ]);
    onAddToThread(topic.question, "provider", "My Wishes");
    onSpeak(sentence);
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
        const sentence = composeWishSentence(locale, tp, sel);
        onSpeak(sentence);
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
          <BottomSheet.Title>{patientName}'s Wishes</BottomSheet.Title>
          <BottomSheet.CloseButton aria-label="Close" />
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
              No wishes were shared.
            </p>
          ) : (
            answeredTopics.map((tp) => {
              const sentence = composeWishSentence(locale, tp, selections[tp.id]);
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
                    {tp.icon} {tp.label}
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
              Share all wishes again
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
            Close
          </Btn>
        </BottomSheet.Actions>
      </BottomSheet>
    );
  }

  /* ── Active topic screen ───────────────────────────────── */

  return (
    <BottomSheet onClose={onClose} t={t}>
      <BottomSheet.Header>
        <BottomSheet.Title>My Wishes</BottomSheet.Title>
        <BottomSheet.CloseButton aria-label="Close" />
        <div style={{ flexBasis: "100%" }}>
          <div
            class="font-sans"
            style={{ fontSize: 13, color: t.muted, marginBottom: 6 }}
          >
            Step {currentIdx + 1} of {SICG_TOPICS.length}
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
        {thread.length > 0 && (
          <div
            ref={threadRef}
            style={{
              maxHeight: "38vh",
              overflowY: "auto",
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: `1px solid ${t.border}`,
            }}
          >
            {thread.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  justifyContent:
                    msg.from === "patient" ? "flex-end" : "flex-start",
                  marginBottom: 8,
                }}
              >
                <div
                  style={{
                    maxWidth: "80%",
                    padding: "10px 14px",
                    borderRadius: 12,
                    fontSize: 16,
                    lineHeight: 1.4,
                    backgroundColor:
                      msg.from === "patient" ? blueBg : t.activeBg,
                    color: msg.from === "patient" ? blue : t.sub,
                    fontWeight: msg.from === "patient" ? 500 : 400,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Topic header */}
        <div style={{ marginBottom: 16, textAlign: "center" }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>{topic.icon}</div>
          <div
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: t.text,
              marginBottom: 4,
            }}
          >
            {topic.label}
          </div>
          <div style={{ fontSize: 18, color: t.sub }}>{topic.question}</div>
        </div>

        {/* Response buttons */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {topic.responses.map((response) => {
            const isSelected = selected.includes(response);

            return (
              <Btn
                key={response}
                onClick={() => toggleResponse(response)}
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
                <span>{response}</span>
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
          Share
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
          Skip
        </Btn>
      </BottomSheet.Actions>
    </BottomSheet>
  );
}

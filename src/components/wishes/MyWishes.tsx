import { useState, useRef, useEffect, useId } from "preact/hooks";
import type { JSX } from "preact";
import type { ThemeTokens, ThemeName } from "../../theme/tokens";
import { getWishTopics, composeWishSentence } from "../../data/phraseRegistry";
import { Btn } from "../shared/Btn";
import { useDialog } from "../../hooks/useDialog";

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
  const responsesRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const { dialogRef } = useDialog({ onClose, titleId });

  const blue = theme === "dark" ? "#60A5FA" : "#2563EB";
  const blueBg = theme === "dark" ? "#1E3A5F" : "#EFF6FF";

  const topic = SICG_TOPICS[currentIdx];
  const selected = selections[topic?.id] ?? [];

  // Scroll thread to bottom when messages added
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

    const sentence = composeWishSentence(locale,topic, selected);

    // Add clinician question + patient response to internal thread
    setThread((prev) => [
      ...prev,
      { from: "provider", text: topic.question },
      { from: "patient", text: sentence },
    ]);

    // Add clinician question silently to main thread
    onAddToThread(topic.question, "provider", "My Wishes");

    // Speak patient response (also adds to main thread)
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
    // Re-speak all composed sentences
    for (const t of SICG_TOPICS) {
      const sel = selections[t.id];
      if (sel && sel.length > 0) {
        const sentence = composeWishSentence(locale,t, sel);
        onSpeak(sentence);
      }
    }
  }

  const preview = selected.length > 0 ? composeWishSentence(locale,topic, selected) : "";

  // --- Styles ---

  const overlay: JSX.CSSProperties = {
    position: "fixed",
    inset: 0,
    zIndex: 1000,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    flexDirection: "column",
    justifyContent: "flex-end",
  };

  const card: JSX.CSSProperties = {
    height: "92vh",
    backgroundColor: t.card,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  };

  const header: JSX.CSSProperties = {
    padding: "16px 20px 12px",
    borderBottom: `1px solid ${t.border}`,
    flexShrink: 0,
  };

  const headerRow: JSX.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  };

  const titleStyle: JSX.CSSProperties = {
    fontSize: 22,
    fontWeight: 700,
    color: t.text,
    margin: 0,
  };

  const progressRow: JSX.CSSProperties = {
    display: "flex",
    gap: 6,
  };

  const threadPane: JSX.CSSProperties = {
    maxHeight: "38%",
    overflowY: "auto",
    padding: "12px 20px",
    flexShrink: 0,
  };

  const bottomPane: JSX.CSSProperties = {
    flex: 1,
    overflowY: "auto",
    padding: "16px 20px",
    borderTop: `1px solid ${t.border}`,
    scrollPaddingBottom: 96,
  };

  const actionBar: JSX.CSSProperties = {
    display: "flex",
    gap: 12,
    padding: "12px 20px",
    borderTop: `1px solid ${t.border}`,
    flexShrink: 0,
  };

  // --- Completion screen ---
  if (complete) {
    const answeredTopics = SICG_TOPICS.filter(
      (t) => selections[t.id] && selections[t.id].length > 0,
    );

    return (
      <div style={overlay} onClick={onClose}>
        <div
          ref={dialogRef}
          tabIndex={-1}
          style={card}
          onClick={(e) => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
        >
          <div style={header}>
            <div style={headerRow}>
              <h2 id={titleId} style={titleStyle}>{patientName}'s Wishes</h2>
              <Btn
                onClick={onClose}
                style={{
                  background: "none",
                  border: "none",
                  fontSize: 28,
                  color: t.sub,
                  padding: 8,
                  minWidth: 64,
                  minHeight: 64,
                }}
                aria-label="Close"
              >
                &#x2715;
              </Btn>
            </div>
          </div>

          <div style={{ flex: 1, overflowY: "auto", padding: "20px" }}>
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
              answeredTopics.map((topic) => {
                const sentence = composeWishSentence(locale,
                  topic,
                  selections[topic.id],
                );
                return (
                  <div
                    key={topic.id}
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
                      {topic.icon} {topic.label}
                    </div>
                    <div style={{ fontSize: 18, color: t.text }}>
                      {sentence}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div style={actionBar}>
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
          </div>
        </div>
      </div>
    );
  }

  // --- Active topic screen ---
  return (
    <div style={overlay} onClick={onClose}>
      <div
        ref={dialogRef}
        tabIndex={-1}
        style={card}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
      >
        {/* Fixed Header */}
        <div style={header}>
          <div style={headerRow}>
            <h2 id={titleId} style={titleStyle}>My Wishes</h2>
            <Btn
              onClick={onClose}
              style={{
                background: "none",
                border: "none",
                fontSize: 28,
                color: t.sub,
                padding: 8,
                minWidth: 64,
                minHeight: 64,
              }}
              aria-label="Close"
            >
              &#x2715;
            </Btn>
          </div>

          {/* Progress: visible step-count + individual bars with aria-current */}
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
                bg = theme === "dark" ? "#93C5FD" : "#93C5FD";
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

        {/* Top pane: internal wishes thread */}
        {thread.length > 0 && (
          <div ref={threadRef} style={threadPane}>
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
                    color:
                      msg.from === "patient" ? blue : t.sub,
                    fontWeight: msg.from === "patient" ? 500 : 400,
                  }}
                >
                  {msg.text}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Bottom pane: current topic */}
        <div ref={responsesRef} style={bottomPane}>
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
            <div style={{ fontSize: 18, color: t.sub }}>
              {topic.question}
            </div>
          </div>

          {/* Live sentence preview */}
          {preview && (
            <div
              style={{
                padding: "12px 16px",
                borderRadius: 12,
                backgroundColor: blueBg,
                color: blue,
                fontSize: 17,
                fontWeight: 500,
                marginBottom: 16,
                lineHeight: 1.4,
              }}
            >
              {preview}
            </div>
          )}

          {/* Response buttons */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
            }}
          >
            {topic.responses.map((response) => {
              const selIdx = selected.indexOf(response);
              const isSelected = selIdx >= 0;

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
                  {/* Numbered circle or empty circle */}
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 16,
                      border: `2px solid ${isSelected ? blue : t.border}`,
                      backgroundColor: isSelected ? blue : "transparent",
                      color: isSelected ? "#fff" : t.sub,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 14,
                      fontWeight: 700,
                      flexShrink: 0,
                    }}
                  >
                    {isSelected ? selIdx + 1 : ""}
                  </div>
                  <span>{response}</span>
                </Btn>
              );
            })}
          </div>
        </div>

        {/* Fixed bottom action bar */}
        <div style={actionBar}>
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
        </div>
      </div>
    </div>
  );
}

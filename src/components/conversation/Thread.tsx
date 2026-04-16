import { useRef, useEffect, useState } from "preact/hooks";
import type { JSX } from "preact";
import type { Message } from "../../types";
import type { ThemeTokens } from "../../theme/tokens";
import { Btn } from "../shared/Btn";

interface ThreadProps {
  messages: Message[];
  t: ThemeTokens;
  onRepeat: (text: string, from: "patient" | "provider") => void;
}

/**
 * Scrollable conversation history with tap-to-repeat.
 *
 * Patient messages render right-aligned with blue background;
 * provider messages left-aligned with card background.
 * Tapping a bubble re-speaks the message without adding a duplicate.
 */
export function Thread({ messages, t, onRepeat }: ThreadProps) {
  const endRef = useRef<HTMLDivElement>(null);
  const [repeatingIdx, setRepeatingIdx] = useState<number | null>(null);

  // Auto-scroll to bottom whenever messages change
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  if (!messages || messages.length === 0) return null;

  const handleTap = (msg: Message, idx: number) => {
    onRepeat(msg.text, msg.from);
    setRepeatingIdx(idx);
    setTimeout(() => setRepeatingIdx(null), 600);
  };

  const wrapperStyle: JSX.CSSProperties = {
    marginBottom: 16,
  };

  const headerStyle: JSX.CSSProperties = {
    textTransform: "uppercase",
    letterSpacing: 2,
    fontSize: 13,
    color: t.muted,
    margin: "0 0 10px 0",
    fontWeight: 600,
  };

  const scrollStyle: JSX.CSSProperties = {
    background: t.activeBg,
    borderRadius: 18,
    padding: "14px 16px",
    maxHeight: 190,
    overflowY: "auto",
    border: `1px solid ${t.border}`,
  };

  return (
    <div style={wrapperStyle}>
      <div style={headerStyle}>Conversation · tap to say again</div>

      <div style={scrollStyle}>
      {messages.map((msg, idx) => {
        const isPatient = msg.from === "patient";
        const isRepeating = repeatingIdx === idx;

        const bubbleStyle: JSX.CSSProperties = {
          display: "flex",
          justifyContent: isPatient ? "flex-end" : "flex-start",
          marginBottom: idx < messages.length - 1 ? 8 : 0,
        };

        const btnStyle: JSX.CSSProperties = {
          background: isPatient
            ? isRepeating
              ? "#1D4ED8"
              : "#2563EB"
            : t.card,
          color: isPatient ? "#FFFFFF" : t.text,
          border: isPatient ? "none" : `1px solid ${t.border}`,
          borderRadius: isPatient ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "10px 14px",
          maxWidth: "78%",
          textAlign: "left" as const,
          fontSize: 16,
          lineHeight: 1.4,
          boxShadow: isRepeating ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
          transition: "background 0.15s, box-shadow 0.15s",
        };

        const metaStyle: JSX.CSSProperties = {
          fontSize: 11,
          color: isPatient ? t.threadMeta : t.threadMetaProvider,
          marginTop: 4,
          display: "flex",
          alignItems: "center",
          gap: 6,
        };

        const repeatIconStyle: JSX.CSSProperties = {
          fontSize: 13,
          opacity: isRepeating ? 1 : 0.7,
        };

        return (
          <div key={idx} style={bubbleStyle}>
            <Btn
              onClick={() => handleTap(msg, idx)}
              style={btnStyle}
              aria-label={`Repeat: ${msg.text}`}
            >
              <div>{msg.text}</div>
              <div style={metaStyle}>
                <span>
                  {msg.label} · {msg.time}
                </span>
                {isRepeating ? (
                  <span style={repeatIconStyle}>speaking ↻</span>
                ) : (
                  <span style={repeatIconStyle}>↻</span>
                )}
              </div>
            </Btn>
          </div>
        );
      })}

      <div ref={endRef} />
      </div>
    </div>
  );
}

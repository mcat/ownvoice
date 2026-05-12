import { useRef, useEffect, useState, useCallback } from "preact/hooks";
import type { JSX } from "preact";
import type { ThreadEntry } from "../../audit/useThreadView";
import type { ThemeTokens } from "../../theme/tokens";
import { t as resolvePhrase } from "../../data/phraseRegistry";
import { useActivePatient } from "../../stores/settingsStore";
import { useSettingsStore } from "../../stores/settingsStore";
import { useUIStore } from "../../stores/uiStore";
import { DualLocaleText } from "../shared/DualLocaleText";
import { Btn } from "../shared/Btn";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { ListenPill } from "./ListenPill";

/** Thread reads `from`, `text`, `gloss`, `icon`, and `label` — never `id`
 *  or `time`. Loose alias keeps test fixtures terse without forcing every
 *  caller to spell out an `id`. */
type ThreadMessage = Omit<ThreadEntry, "id" | "time"> & {
  id?: string;
  time?: number;
};

interface ThreadProps {
  messages: readonly ThreadMessage[];
  t: ThemeTokens;
  onRepeat: (text: string, from: "patient" | "provider") => void;
}

// Each click scrolls ~85% of the visible area so one line of overlap stays on
// screen — patients don't lose their place mid-conversation. < 100% keeps
// context, > 50% means a long log only takes a couple of taps to traverse.
const SCROLL_STEP_RATIO = 0.85;

/**
 * Scrollable conversation history with tap-to-repeat.
 *
 * Patient messages render right-aligned with blue background;
 * provider messages left-aligned with card background.
 * Tapping a bubble re-speaks the message without adding a duplicate.
 *
 * When a message carries a `gloss` that differs from `text`, the bubble
 * renders a secondary-locale line via `<DualLocaleText variant="transcript">`.
 */
export function Thread({ messages, t, onRepeat }: ThreadProps) {
  const active = useActivePatient();
  const patientLang = active?.patientLang ?? "en";
  const caregiverLang = useSettingsStore((s) => s.cfg?.caregiverLang ?? "en");
  // Active provider for ListenPill labelling. uiStore exposes only the index;
  // the provider list itself lives on settingsStore.cfg.providers (same lookup
  // pattern as useSpeakActions). Fall back to "Care Team" when no provider is
  // configured — matches the default label used elsewhere in the app.
  const activeProvIdx = useUIStore((s) => s.activeProvIdx);
  const providerName = useSettingsStore(
    (s) =>
      s.cfg?.providers?.[activeProvIdx]?.name ??
      s.cfg?.providers?.[0]?.name ??
      "Care Team",
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  // Target node for the ListenPill's draft portal. State (not ref) so
  // the ListenPill re-renders once the host div mounts and the portal
  // can attach. Without state, the first render passes `null` and the
  // draft never appears in the scroll content.
  const [draftHost, setDraftHost] = useState<HTMLDivElement | null>(null);
  const [repeatingIdx, setRepeatingIdx] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const [atTop, setAtTop] = useState(true);
  const [atBottom, setAtBottom] = useState(true);
  // Suppression window for bound updates during the programmatic scroll
  // that fires on each new message. Smooth scrollIntoView dispatches a
  // stream of scroll events; without this, atBottom briefly flips
  // false→true mid-animation and the Down arrow visibly flashes every
  // time a phrase is tapped. The post-message auto-scroll always lands at
  // the bottom, so we can safely ignore intermediate values and settle
  // once the animation finishes. We deliberately *don't* suppress on the
  // initial mount — there's no prior state to flicker from there.
  const autoScrollSuppressUntil = useRef(0);
  const prevMessagesLength = useRef<number | null>(null);
  // Tracks whether the user was pinned to the bottom *before* the next
  // message arrives. If they've scrolled up to read history, we honour
  // that and don't yank them back. Without this, tapping a new phrase
  // (or any new event in the thread) hides the older context they were
  // reading — which is what surfaced as "the log only shows the most
  // recent phrase."
  const wasAtBottomRef = useRef(true);

  // Recompute boundary flags so the arrow buttons reflect aria-disabled
  // state. 1px tolerance covers sub-pixel rounding from smooth scroll.
  const updateBounds = useCallback(() => {
    if (Date.now() < autoScrollSuppressUntil.current) return;
    const el = scrollRef.current;
    if (!el) return;
    const { scrollTop, scrollHeight, clientHeight } = el;
    const overflow = scrollHeight - clientHeight;
    const top = scrollTop <= 1;
    const bottom = overflow <= 1 || scrollTop >= overflow - 1;
    setAtTop(top);
    setAtBottom(bottom);
    wasAtBottomRef.current = bottom;
  }, []);

  // Auto-scroll to bottom on new messages, but only if the user is
  // already pinned to the bottom (or this is the first paint). If they
  // scrolled up to read history, leave their position alone.
  // The `behavior` JS option overrides CSS `scroll-behavior`, so the
  // `prefers-reduced-motion` media rule in app.css does NOT silence this
  // call — we must branch explicitly (WCAG 2.3.3 AAA).
  useEffect(() => {
    const isFirstPaint = prevMessagesLength.current === null;
    const isMessageArrival =
      !isFirstPaint && prevMessagesLength.current !== messages.length;
    prevMessagesLength.current = messages.length;
    const shouldScroll = isFirstPaint || (isMessageArrival && wasAtBottomRef.current);
    if (!shouldScroll) {
      updateBounds();
      return;
    }
    endRef.current?.scrollIntoView({
      behavior: reducedMotion ? "auto" : "smooth",
    });
    if (!isMessageArrival) {
      updateBounds();
      return;
    }
    // Hold the bound state through the smooth-scroll animation, then
    // settle once after it completes. 600ms covers Chromium's typical
    // scrollIntoView duration with margin; reduced-motion is instant
    // anyway so the settle just reads the final state.
    autoScrollSuppressUntil.current = Date.now() + 600;
    const settle = window.setTimeout(() => {
      autoScrollSuppressUntil.current = 0;
      updateBounds();
    }, 650);
    return () => window.clearTimeout(settle);
  }, [messages.length, reducedMotion, updateBounds]);

  // Keep arrow-button bounds in sync with manual scrolling (wheel, touch,
  // keyboard) and with viewport resizes that change clientHeight.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    updateBounds();
    el.addEventListener("scroll", updateBounds, { passive: true });
    window.addEventListener("resize", updateBounds);
    return () => {
      el.removeEventListener("scroll", updateBounds);
      window.removeEventListener("resize", updateBounds);
    };
  }, [updateBounds, messages.length]);

  const scrollByStep = (direction: 1 | -1) => {
    const el = scrollRef.current;
    if (!el) return;
    if (direction === -1 && atTop) return;
    if (direction === 1 && atBottom) return;
    const delta = el.clientHeight * SCROLL_STEP_RATIO * direction;
    el.scrollBy({ top: delta, behavior: reducedMotion ? "auto" : "smooth" });
  };

  const hasMessages = messages && messages.length > 0;

  const handleTap = (msg: ThreadMessage, idx: number) => {
    onRepeat(msg.text, msg.from);
    setRepeatingIdx(idx);
    setTimeout(() => setRepeatingIdx(null), 600);
  };

  // Outer container is a flex column: the row of (arrows + scrolling log)
  // sits on top; the ListenPill is a fixed-height sibling pinned below the
  // scrolling region. Anchoring the pill outside `scrollRef` means it stays
  // visible even as the message list scrolls, so providers can always reach
  // the "Listen" affordance.
  const outerStyle: JSX.CSSProperties = {
    marginBottom: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flexShrink: 0,
  };

  // row-reverse keeps the visual layout (log left, arrows right) while
  // moving the arrow column FIRST in the DOM. Tab/scan order follows DOM,
  // so switch users land on Up → Down before the message bubbles, instead
  // of having to step through every message to reach the scroll affordance.
  // Mouse/touch users see no change.
  const wrapperStyle: JSX.CSSProperties = {
    flexShrink: 0,
    display: "flex",
    flexDirection: "row-reverse",
    gap: 12,
    alignItems: "stretch",
  };

  // The bordered "thread surface" is a position:relative box that holds
  // (a) the scrolling message list and (b) the absolutely-positioned
  // ListenPill anchor. The pill anchors to this OUTER box's viewport,
  // NOT to the scrolling content — so it stays put regardless of scroll
  // position. Putting position:relative on the scrolling div itself
  // would anchor the pill to the scroll content (it would move with
  // messages), which is the bug we're avoiding.
  const surfaceStyle: JSX.CSSProperties = {
    background: t.activeBg,
    borderRadius: 18,
    border: `1px solid ${t.border}`,
    flex: 1,
    minWidth: 0,
    height: 200,
    position: "relative",
    overflow: "hidden",
  };

  // Inner scrolling region fills the surface. No uniform paddingBottom —
  // it would lift right-side (patient) bubbles away from the bottom even
  // though the pill anchors on the left and doesn't obscure them. The
  // last-provider-bubble loop below applies a localized bottom margin
  // only when it's needed.
  const scrollStyle: JSX.CSSProperties = {
    width: "100%",
    height: "100%",
    overflowY: "auto",
    padding: "14px 16px",
    boxSizing: "border-box",
  };

  // Pill anchor sits OUTSIDE the scrolling div but inside the bordered
  // surface — it's a sibling of the scroll region. pointerEvents:"none"
  // on the wrapper + "auto" on the inner div let the empty area to the
  // right of the pill stay click/scroll-through to messages behind.
  const pillAnchorStyle: JSX.CSSProperties = {
    position: "absolute",
    left: 12,
    bottom: 12,
    right: 12,
    pointerEvents: "none",
    zIndex: 1,
  };

  // Project standard: 64×64 minimum patient touch target (CLAUDE.md).
  // #1E40AF passes WCAG 1.4.6 AAA (7:1) against the white glyph; the same
  // brand-deep blue used for patient bubbles, so the buttons read as part
  // of the patient surface, not as separate chrome.
  const arrowColumnStyle: JSX.CSSProperties = {
    display: "flex",
    flexDirection: "column",
    gap: 8,
    flexShrink: 0,
  };

  // outlineOffset: 2 pushes the global focus ring (#2563EB / #60A5FA from
  // app.css) outside the button border so it contrasts against the page bg
  // — without this, the ring sits *on* #1E40AF at ~1.6:1 contrast (fails).
  // flex: 1 lets each arrow grow to half the column height; the 64px min
  // floors the touch target.
  const arrowBtnStyle = (disabled: boolean): JSX.CSSProperties => ({
    width: 64,
    minWidth: 64,
    minHeight: 64,
    flex: 1,
    background: disabled ? t.card : "#1E40AF",
    color: disabled ? t.muted : "#FFFFFF",
    border: `2px solid ${disabled ? t.border : "#1E40AF"}`,
    borderRadius: 12,
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 28,
    lineHeight: 1,
    padding: 0,
    outlineOffset: 2,
    transition: "background 0.15s, border-color 0.15s",
  });

  return (
    <div style={outerStyle}>
    <div style={wrapperStyle}>
      {/* Arrow column first in DOM (visually right via row-reverse) so the
          tab/scan order is Up → Down → bubble[0] → bubble[N]. Without this,
          a switch user with 30 messages would have to step through every
          bubble to reach scroll. Arrows are only shown when there are
          messages to scroll through. */}
      {hasMessages && (
        <div style={arrowColumnStyle}>
          <Btn
            onClick={() => scrollByStep(-1)}
            aria-label={resolvePhrase("ui.dual.thread.scroll_up_aria", patientLang)}
            aria-disabled={atTop}
            aria-controls="ov-thread-log"
            style={arrowBtnStyle(atTop)}
          >
            <span aria-hidden="true">▲</span>
          </Btn>
          <Btn
            onClick={() => scrollByStep(1)}
            aria-label={resolvePhrase("ui.dual.thread.scroll_down_aria", patientLang)}
            aria-disabled={atBottom}
            aria-controls="ov-thread-log"
            style={arrowBtnStyle(atBottom)}
          >
            <span aria-hidden="true">▼</span>
          </Btn>
        </div>
      )}
      <div style={surfaceStyle}>
      <div
        ref={scrollRef}
        id="ov-thread-log"
        role="log"
        aria-label={resolvePhrase("ui.dual.thread.aria_label", patientLang)}
        aria-live="polite"
        aria-relevant="additions text"
        style={scrollStyle}
      >
      {messages.map((msg, idx) => {
        const isPatient = msg.from === "patient";
        const isRepeating = repeatingIdx === idx;
        const showGloss = !!msg.gloss && msg.gloss !== msg.text;
        const isLast = idx === messages.length - 1;

        // Only the LAST left-side (provider) bubble needs space below it
        // to clear the absolute-positioned Listen pill at bottom-left.
        // Right-side (patient) bubbles flow to the bottom without
        // obstruction since the pill is in the opposite lane.
        const pillClearanceMargin = isLast && !isPatient ? 72 : 0;

        const bubbleStyle: JSX.CSSProperties = {
          display: "flex",
          justifyContent: isPatient ? "flex-end" : "flex-start",
          marginBottom: isLast ? pillClearanceMargin : 8,
        };

        const btnStyle: JSX.CSSProperties = {
          // #1E40AF is a darker shade of the patient-blue brand that passes
          // WCAG 1.4.6 AAA (7:1) against white text; #2563EB is only AA (5.16:1).
          // Thread bubbles persist, so AAA matters; transient "lit" states
          // elsewhere stay on the lighter brand color.
          background: isPatient
            ? isRepeating
              ? "#1E3A8A"
              : "#1E40AF"
            : t.card,
          color: isPatient ? "#FFFFFF" : t.text,
          border: isPatient ? "none" : `1px solid ${t.border}`,
          borderRadius: isPatient ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
          padding: "10px 14px",
          maxWidth: "78%",
          textAlign: "left" as const,
          fontSize: 18,
          lineHeight: 1.4,
          boxShadow: isRepeating ? "0 2px 8px rgba(0,0,0,0.18)" : "none",
          transition: "background 0.15s, box-shadow 0.15s",
        };

        // Determine locale pair for DualLocaleText
        const primaryLocale = isPatient ? patientLang : caregiverLang;
        const glossLocale = isPatient ? caregiverLang : patientLang;

        return (
          <div key={idx} style={bubbleStyle}>
            <Btn
              onClick={() => handleTap(msg, idx)}
              style={btnStyle}
              aria-label={resolvePhrase("ui.dual.thread.repeat_aria", patientLang).replace("{text}", msg.text)}
            >
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  verticalAlign: "middle",
                }}
              >
                {msg.icon && (
                  <span
                    aria-hidden="true"
                    style={{ lineHeight: 1, flexShrink: 0 }}
                  >
                    {msg.icon}
                  </span>
                )}
                {showGloss ? (
                  <DualLocaleText
                    variant="transcript"
                    primaryKey={"quick.yes" as never}
                    primaryLocale={primaryLocale}
                    glossLocale={glossLocale}
                    primaryText={msg.text}
                    glossText={msg.gloss}
                  />
                ) : (
                  msg.text
                )}
              </span>
            </Btn>
          </div>
        );
      })}

      {/* Portal target for the ListenPill's draft block. Lives inside
          the scrolling content so the draft flows with messages and is
          clipped by the surface's overflow:hidden — solving the case
          where a multi-sentence draft would otherwise spill outside the
          bordered area. */}
      <div ref={setDraftHost} />
      <div ref={endRef} />
      </div>
      {/* ListenPill anchors to the bordered SURFACE (not the scroll
          content) so it stays put regardless of scroll position. The
          scroll region is a sibling above this div, not an ancestor.
          Draft block, when present, portals into the draftHost above. */}
      <div style={pillAnchorStyle}>
        <div style={{ pointerEvents: "auto" }}>
          <ListenPill
            providerName={providerName}
            language={caregiverLang}
            t={t}
            draftTarget={draftHost}
          />
        </div>
      </div>
      </div>
    </div>
    </div>
  );
}

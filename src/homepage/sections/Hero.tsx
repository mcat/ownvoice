import { homepageTheme as t } from "../theme";

/**
 * Problem-led hero. The headline stat is citation-grounded: 53.9% of
 * mechanically ventilated patients meet basic communication criteria —
 * awake, alert, responsive (Happ et al., 2015,
 * doi:10.1016/j.hrtlng.2014.08.010). The 35%-of-bed-days stat
 * (Freeman-Sanderson et al., 2019) lives in TheProblem's stat cards.
 * The dark-slate background contrasts against the lighter sections
 * below.
 */
export function Hero() {
  return (
    <section
      style={{
        background: t.color.heroBg,
        color: t.color.heroText,
        padding: "72px 32px 56px",
      }}
    >
      <div style={{ maxWidth: t.maxWidth, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: "#94a3b8",
          }}
        >
          OwnVoice
        </div>
        <h1
          style={{
            marginTop: 16,
            fontSize: "clamp(28px, 4vw, 40px)",
            fontWeight: 600,
            lineHeight: 1.18,
            letterSpacing: "-0.02em",
            maxWidth: 720,
          }}
        >
          Half of ventilated ICU patients are awake, alert, and unable to speak.
        </h1>
        <p
          style={{
            marginTop: 18,
            fontSize: 17,
            lineHeight: t.bodyLineHeight,
            color: t.color.heroSubdued,
            maxWidth: t.bodyMaxWidth,
          }}
        >
          OwnVoice is augmentative and alternative communication (AAC) software for ICU
          patients who temporarily can&rsquo;t speak after intubation, tracheostomy, or
          surgery. It runs in the browser on a bedside iPad and speaks in the
          patient&rsquo;s own cloned voice, with validated pain assessment and structured
          goals-of-care conversations built in.
        </p>
        <div style={{ display: "flex", gap: 12, marginTop: 28, flexWrap: "wrap" }}>
          <a
            href="/app/"
            style={{
              background: t.color.heroText,
              color: t.color.text,
              padding: "10px 18px",
              borderRadius: t.radius,
              fontSize: 14,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Set up a patient
          </a>
          <a
            href="/research"
            style={{
              color: t.color.heroSubdued,
              padding: "10px 14px",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            Read the research plan
          </a>
        </div>
      </div>
    </section>
  );
}

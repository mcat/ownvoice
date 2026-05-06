import { homepageTheme as t } from "../theme";

/**
 * Problem-led hero. Opens with the citation-grounded ICU stat from
 * Zubow & Hurtig 2013 / Freeman-Sanderson 2019. Three CTAs: demo, real
 * setup, research plan. The dark-slate background contrasts against the
 * lighter sections below.
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
          Roughly 33% of ICU patients can&rsquo;t speak. They use AAC only 11% of the time.
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
          OwnVoice is a browser-based augmentative and alternative communication (AAC)
          application &mdash; software that gives people a way to communicate when speech
          isn&rsquo;t available &mdash; for ICU patients who are temporarily unable to speak,
          typically from tracheostomy, intubation, or post-surgical recovery. On-device
          voice cloning, validated pain assessment, structured goals-of-care.
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

import { homepageTheme as t } from "../theme";

/**
 * Bottom CTA strip. Mirrors the hero's primary actions for readers who
 * scrolled to the end. The device-support note clarifies that the iPad
 * is the production target but desktop browsers work for evaluation.
 */
export function CTA() {
  return (
    <section
      style={{
        padding: t.sectionPadding,
        textAlign: "center",
        borderTop: `1px solid ${t.color.border}`,
      }}
    >
      <h2
        style={{
          fontSize: 22,
          fontWeight: 600,
          color: t.color.text,
          letterSpacing: "-0.01em",
          margin: 0,
        }}
      >
        Try the app on your iPad.
      </h2>
      <p
        style={{
          fontSize: 14,
          color: t.color.muted,
          marginTop: 8,
        }}
      >
        Best on iPad Pro (M5/M4) with Safari 26+. Works in Chrome, Edge, and Firefox for
        evaluation.
      </p>
      <div
        style={{
          display: "flex",
          gap: 12,
          marginTop: 18,
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        <a
          href="/app/"
          style={{
            background: t.color.accent,
            color: "#fff",
            padding: "10px 18px",
            borderRadius: t.radius,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          Set up a patient
        </a>
      </div>
    </section>
  );
}

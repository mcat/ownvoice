import type { ComponentChildren } from "preact";
import { homepageTheme as t } from "../theme";

/**
 * §2 — The stakes. What changes at the bedside when AAC actually works.
 * Three outcome statements with primary citations, plus a lead paragraph
 * on the family experience. Sits between TheProblem (what's wrong) and
 * TheSystem (what we built) so the page tells: problem → why fixing it
 * matters → how we fix it → how we'll prove it.
 */
export function TheStakes() {
  return (
    <section
      style={{
        padding: t.sectionPadding,
        borderTop: `1px solid ${t.color.border}`,
        background: t.color.surface,
      }}
    >
      <div style={{ maxWidth: t.maxWidth, margin: "0 auto" }}>
        <div
          style={{
            fontSize: 11,
            letterSpacing: "2px",
            textTransform: "uppercase",
            color: t.color.muted,
          }}
        >
          §2 &middot; The stakes
        </div>
        <h2
          style={{
            marginTop: 12,
            fontSize: 22,
            fontWeight: 600,
            color: t.color.text,
            letterSpacing: "-0.01em",
            maxWidth: t.bodyMaxWidth,
          }}
        >
          Working AAC reduces anxiety, captures pain accurately, and restores a voice in care decisions.
        </h2>
        <p
          style={{
            marginTop: 16,
            fontSize: 15,
            lineHeight: t.bodyLineHeight,
            color: t.color.body,
            maxWidth: t.bodyMaxWidth,
          }}
        >
          Families are usually unprepared for a loved one&rsquo;s loss of voice and end up
          guessing at lip movements across the rails. When the bedside tool fits, that
          guesswork falls away &mdash; patients can flag pain accurately, conversations
          about goals of care happen <em>with</em> the patient instead of around them, and
          the nurse&rsquo;s role shifts from interpreter to collaborator{" "}
          <CiteLink href="https://doi.org/10.4037/ajcc2021666">(Happ, 2021)</CiteLink>.
        </p>
        <ul
          style={{
            marginTop: 22,
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: 14,
            maxWidth: t.bodyMaxWidth,
          }}
        >
          <Outcome title="Lower patient anxiety">
            Communication failure is a primary driver of psycho-emotional distress in
            mechanically ventilated patients{" "}
            <CiteLink href="https://doi.org/10.4037/ajcc2011989">
              (Khalaila et al., 2011)
            </CiteLink>
            ; recent intervention evidence shows visual-interface AAC reliably reduces
            patient anxiety{" "}
            <CiteLink href="https://doi.org/10.1044/2024_AJSLP-23-00310">
              (LaValley et al., 2024)
            </CiteLink>
            .
          </Outcome>
          <Outcome title="Accurate pain and symptom self-reporting">
            Without a working tool, staff infer; with one, patients report. Symptom
            self-reporting accuracy is among the most reliably documented outcomes of AAC
            interventions in critical care{" "}
            <CiteLink href="https://doi.org/10.1044/2024_AJSLP-23-00310">
              (LaValley et al., 2024)
            </CiteLink>
            .
          </Outcome>
          <Outcome title="A voice in goals-of-care decisions">
            Patients without functional speech describe a &ldquo;silent, slow
            lifeworld&rdquo; with diminished agency{" "}
            <CiteLink href="https://doi.org/10.1177/1049732307307334">
              (Carroll, 2007)
            </CiteLink>
            . AAC restores the ability to participate in their own care &mdash; the
            difference between being treated and being included.
          </Outcome>
        </ul>
      </div>
    </section>
  );
}

function Outcome({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <li
      style={{
        background: t.color.bg,
        border: `1px solid ${t.color.border}`,
        padding: 16,
        borderRadius: t.radius,
      }}
    >
      <div style={{ fontWeight: 600, color: t.color.text, fontSize: 14 }}>{title}</div>
      <div
        style={{
          marginTop: 6,
          fontSize: 13,
          lineHeight: 1.55,
          color: t.color.body,
        }}
      >
        {children}
      </div>
    </li>
  );
}

function CiteLink({ href, children }: { href: string; children: ComponentChildren }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{ color: t.color.muted, textDecoration: "underline", textUnderlineOffset: 2 }}
    >
      {children}
    </a>
  );
}

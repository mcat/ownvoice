import type { ComponentChildren } from "preact";
import { homepageTheme as t } from "../theme";

/**
 * §2 — The stakes. What's actually at stake at the bedside when AAC
 * doesn't work — grounded in the SPEACS usual-care observation study
 * (Happ et al., 2011: 37.7% of pain communications unsuccessful, 40% of
 * sessions rated somewhat-to-extremely difficult, assistive materials
 * essentially unused), the psychoemotional-distress evidence (Khalaila
 * et al., 2011), the AAC-intervention scoping review (LaValley et al.,
 * 2024), and Carroll's lived-experience finding (Carroll, 2007).
 *
 * Sits between TheProblem (what's wrong) and TheSystem (what we built):
 * problem → why fixing it matters → how we fix it → how we'll prove it.
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
          guessing at lip movements across the rails. When the SPEACS team video-recorded
          usual care between nurses and nonspeaking ICU patients, the gaps were specific:
          more than a third of communication exchanges about pain failed, patients rated
          40% of their sessions somewhat to extremely difficult, and assistive
          communication materials went almost entirely unused{" "}
          <CiteLink href="https://doi.org/10.4037/ajcc2011433">
            (Happ et al., 2011)
          </CiteLink>
          . With a tool that fits, the nurse&rsquo;s role shifts from interpreter to
          collaborator{" "}
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
          <Outcome title="Emotional state, not just physical symptoms">
            Communication difficulty is itself a predictor of psycho-emotional distress,
            fear, and anger in mechanically ventilated patients{" "}
            <CiteLink href="https://doi.org/10.4037/ajcc2011989">
              (Khalaila et al., 2011)
            </CiteLink>
            . Across available studies, visual-interface AAC interventions show measurable
            treatment effects on patient anxiety and comfort &mdash; though high-quality
            trials remain scarce{" "}
            <CiteLink href="https://doi.org/10.1044/2024_AJSLP-23-00310">
              (LaValley et al., 2024)
            </CiteLink>
            .
          </Outcome>
          <Outcome title="Pain, reported instead of inferred">
            In video-recorded usual care, more than one-third (37.7%) of nurse&ndash;patient
            communication exchanges about pain were unsuccessful{" "}
            <CiteLink href="https://doi.org/10.4037/ajcc2011433">
              (Happ et al., 2011)
            </CiteLink>
            . Without an interface, staff infer; with one, patients report &mdash; and
            symptom self-reporting is among the outcome domains where AAC interventions
            show demonstrable treatment effects{" "}
            <CiteLink href="https://doi.org/10.1044/2024_AJSLP-23-00310">
              (LaValley et al., 2024)
            </CiteLink>
            .
          </Outcome>
          <Outcome title="Questions about their own care">
            Patients without functional speech describe a &ldquo;silent, slow
            lifeworld&rdquo; of diminished agency{" "}
            <CiteLink href="https://doi.org/10.1177/1049732307307334">
              (Carroll, 2007)
            </CiteLink>
            , and patients rated 40% of their communication sessions with nurses as
            somewhat to extremely difficult{" "}
            <CiteLink href="https://doi.org/10.4037/ajcc2011433">
              (Happ et al., 2011)
            </CiteLink>
            . AAC restores the ability to ask &mdash; the difference between being treated
            and being included.
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

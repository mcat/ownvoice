import type { ComponentChildren } from "preact";
import { homepageTheme as t } from "../theme";

/**
 * §2 — The stakes. What's actually at stake at the bedside when AAC
 * doesn't work — grounded in the SPEACS catalog of failed communication
 * categories (Happ et al., 2011: pain, physical needs, emotional state,
 * care-plan questions) and Carroll's lived-experience finding (Carroll,
 * 2007). Each outcome card pairs a SPEACS content category that fails
 * without AAC with the outcome AAC delivers.
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
          guessing at lip movements across the rails. The SPEACS program catalogued what
          specifically goes un-said in those gaps: pain reports, basic physical needs
          (water, repositioning, bathroom), emotional state, and questions about the care
          plan{" "}
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
            Communication failure is itself a primary driver of psycho-emotional distress
            in mechanically ventilated patients{" "}
            <CiteLink href="https://doi.org/10.4037/ajcc2011989">
              (Khalaila et al., 2011)
            </CiteLink>
            , and emotional expression is one of the four SPEACS-catalogued bedside needs
            most often left un-said{" "}
            <CiteLink href="https://doi.org/10.4037/ajcc2011433">
              (Happ et al., 2011)
            </CiteLink>
            . Visual-interface AAC reliably reduces that distress once in place{" "}
            <CiteLink href="https://doi.org/10.1044/2024_AJSLP-23-00310">
              (LaValley et al., 2024)
            </CiteLink>
            .
          </Outcome>
          <Outcome title="The bedside specifics — pain, water, repositioning">
            SPEACS ranked these as the bedside needs most likely to go un-spoken without a
            working tool, alongside basic toileting and comfort requests{" "}
            <CiteLink href="https://doi.org/10.4037/ajcc2011433">
              (Happ et al., 2011)
            </CiteLink>
            . Without an interface, staff infer; with one, patients report &mdash; and
            symptom self-reporting accuracy is among the most reliably documented outcomes
            of AAC interventions in critical care{" "}
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
            , and &ldquo;questions about the care plan&rdquo; is one of the four SPEACS
            categories of failed bedside communication{" "}
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

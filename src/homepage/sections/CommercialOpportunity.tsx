import type { ComponentChildren } from "preact";
import { homepageTheme as t } from "../theme";

/**
 * §7 — Commercial opportunity. Abbreviated market context for prospective
 * clinical co-founders, advisors, and partners. The strategy memo at
 * docs/strategy/2026-05-06-business-strategy.md carries the full GTM
 * scaling table, pricing detail, acquirer thesis, and risk inventory;
 * this section is the public-facing summary.
 */
export function CommercialOpportunity() {
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
          §7 &middot; Commercial opportunity
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
          An AAC opportunity no current hardware or software vendor addresses.
        </h2>

        <Block title="Market">
          <p style={{ margin: 0 }}>
            OwnVoice serves ICU and acute-care units in US hospitals &mdash;
            roughly 11,000 units across 6,000 hospitals, plus a secondary
            opportunity in post-acute and pre-surgical voice banking. The
            clinical-organization subscription TAM is approximately
            $70&ndash;85M annual recurring revenue at full US penetration;
            international expansion roughly doubles that ceiling.
          </p>
        </Block>

        <Block title="Differentiation">
          <p style={{ margin: 0 }}>
            The AAC market splits into two segments. <strong>Hardware-centric
            vendors</strong> (Tobii Dynavox, PRC-Saltillo, Lingraphica) ship
            FDA Class II Speech Generating Devices on dedicated hardware, with
            generic synthesized voices, English-focused, with strong CMS
            reimbursement but weak hospital adoption.{" "}
            <strong>Software AAC apps for ICU</strong> (VidaTalk, CommuniCare,
            YoDoc) are tablet apps with phrase libraries &mdash; several
            multilingual &mdash; but with no FDA registration, no voice
            cloning, and no on-device speech-to-text. None can speak in the
            patient&rsquo;s own voice.
          </p>
          <p style={{ marginTop: 12, marginBottom: 0 }}>
            OwnVoice differentiates on four dimensions uncontested by either
            segment:
          </p>
          <ul
            style={{
              marginTop: 8,
              marginBottom: 0,
              paddingLeft: 20,
              lineHeight: 1.55,
            }}
          >
            <li>
              On-device voice cloning from short reference samples, with cloud
              premium tier for hard cases (poor or short reference audio)
            </li>
            <li>23-language voice synthesis with cross-lingual capability</li>
            <li>
              Browser-based deployment &mdash; URL only, no MDM, no app store,
              no install
            </li>
            <li>
              Goals-of-care integration via the Serious Illness Conversation
              Guide (Ariadne Labs at BWH)
            </li>
          </ul>
        </Block>

        <Block title="Open positions">
          <ul
            style={{
              marginTop: 0,
              marginBottom: 0,
              paddingLeft: 20,
              lineHeight: 1.55,
            }}
          >
            <li>
              <strong>Clinical co-founder</strong> &mdash; palliative care or critical
              care, Boston-area academic medical center affiliation preferred
            </li>
            <li>
              <strong>Clinical advisory board members</strong> &mdash; palliative
              care, critical care nursing, ICU SLP
            </li>
            <li>
              <strong>Software engineer</strong> (TypeScript, Preact, on-device ML)
              &mdash; late 2026
            </li>
          </ul>
        </Block>
      </div>
    </section>
  );
}

function Block({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <div style={{ marginTop: 22, maxWidth: t.bodyMaxWidth }}>
      <h3
        style={{
          fontSize: 14,
          fontWeight: 600,
          color: t.color.text,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 8,
        }}
      >
        {title}
      </h3>
      <div
        style={{
          fontSize: t.bodyFontSize,
          lineHeight: t.bodyLineHeight,
          color: t.color.body,
        }}
      >
        {children}
      </div>
    </div>
  );
}

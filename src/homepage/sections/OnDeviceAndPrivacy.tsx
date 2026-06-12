import { homepageTheme as t } from "../theme";

/**
 * §5 — On-device & privacy. Single paragraph reinforcing the
 * privacy-by-design posture for IRB readers.
 */
export function OnDeviceAndPrivacy() {
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
          §5 &middot; On-device & privacy
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
          No PHI ever leaves the tablet.
        </h2>
        <p
          style={{
            marginTop: 14,
            fontSize: t.bodyFontSize,
            lineHeight: t.bodyLineHeight,
            color: t.color.body,
            maxWidth: t.bodyMaxWidth,
          }}
        >
          All inference &mdash; voice cloning and speech-to-text &mdash;
          runs in the browser via WebGPU and ONNX Runtime Web. Voice samples and patient
          data stay on-device only. The app is a URL: no App Store install, no cloud, no
          MDM dependency. A nurse opens it, types a name, and hands the iPad to a patient.
        </p>
      </div>
    </section>
  );
}

import { homepageTheme as t } from "../theme";

/**
 * Footer. Status line + internal links + author attribution. The
 * "Not for clinical use" disclaimer is non-negotiable per the project
 * README and PRD.
 */
export function Footer() {
  return (
    <footer
      style={{
        padding: "24px 32px",
        background: "#1c1917",
        color: "#d6d3d1",
        fontSize: 12,
      }}
    >
      <div
        style={{
          maxWidth: t.maxWidth,
          margin: "0 auto",
          display: "flex",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <div>OwnVoice &middot; v0.1 prototype &middot; Not for clinical use without validation</div>
        <div style={{ display: "flex", gap: 16 }}>
          <a href="/research" style={{ color: "#d6d3d1", textDecoration: "none" }}>
            Research plan
          </a>
          <a href="/bibliography" style={{ color: "#d6d3d1", textDecoration: "none" }}>
            Bibliography
          </a>
          <a
            href="https://www.markcatalano.com/"
            target="_blank"
            rel="noopener noreferrer external"
            aria-label="Created by Mark Catalano (opens in a new tab)"
            style={{ color: "#d6d3d1", textDecoration: "none" }}
          >
            Created by Mark Catalano
          </a>
        </div>
      </div>
    </footer>
  );
}

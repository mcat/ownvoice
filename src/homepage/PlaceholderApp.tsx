export function PlaceholderApp() {
  return (
    <main
      style={{
        fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
        maxWidth: 640,
        margin: "10vh auto",
        padding: "0 24px",
        color: "#1c1917",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em", margin: 0 }}>
        OwnVoice
      </h1>
      <p style={{ fontSize: 16, lineHeight: 1.55, marginTop: 16, color: "#44403c" }}>
        A browser-based AAC application for ICU patients who are temporarily unable to speak.
        On-device voice cloning, validated pain assessment, structured goals-of-care.
      </p>
      <p style={{ fontSize: 14, color: "#78716c", marginTop: 24 }}>
        Homepage coming soon.
      </p>
      <a
        href="/app/"
        style={{
          display: "inline-block",
          marginTop: 16,
          padding: "10px 18px",
          background: "#0f172a",
          color: "#fff",
          textDecoration: "none",
          borderRadius: 6,
          fontSize: 14,
          fontWeight: 600,
        }}
      >
        Open the app →
      </a>
    </main>
  );
}

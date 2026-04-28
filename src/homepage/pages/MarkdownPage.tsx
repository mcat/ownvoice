import Markdown from "markdown-to-jsx";
import { homepageTheme as t } from "../theme";

/**
 * Shared long-form-markdown page wrapper. Used by /research and
 * /bibliography to render their respective `docs/*.md` files with
 * consistent editorial typography. The `<Markdown>` component from
 * markdown-to-jsx parses the markdown AST and emits real Preact
 * VNodes — no string-to-DOM shortcut, so the security model is the
 * same as ordinary JSX.
 */

const inlineCodeStyle = {
  background: t.color.surface,
  padding: "1px 5px",
  borderRadius: 3,
  fontSize: "0.9em",
  fontFamily: "ui-monospace, SFMono-Regular, monospace",
};

const overrides = {
  h1: {
    props: {
      style: {
        fontSize: 28,
        fontWeight: 600,
        letterSpacing: "-0.02em",
        color: t.color.text,
        margin: "0 0 24px 0",
      },
    },
  },
  h2: {
    props: {
      style: {
        fontSize: 22,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        color: t.color.text,
        margin: "40px 0 12px 0",
      },
    },
  },
  h3: {
    props: {
      style: {
        fontSize: 17,
        fontWeight: 600,
        color: t.color.text,
        margin: "28px 0 8px 0",
      },
    },
  },
  h4: {
    props: {
      style: {
        fontSize: 15,
        fontWeight: 600,
        color: t.color.text,
        margin: "20px 0 6px 0",
      },
    },
  },
  p: { props: { style: { margin: "12px 0" } } },
  ul: { props: { style: { paddingLeft: 24, margin: "12px 0" } } },
  ol: { props: { style: { paddingLeft: 24, margin: "12px 0" } } },
  li: { props: { style: { margin: "6px 0" } } },
  a: { props: { style: { color: t.color.text } } },
  hr: {
    props: {
      style: {
        border: "none",
        borderTop: `1px solid ${t.color.border}`,
        margin: "32px 0",
      },
    },
  },
  code: { props: { style: inlineCodeStyle } },
  pre: {
    props: {
      style: {
        background: t.color.surface,
        padding: 12,
        borderRadius: t.radius,
        overflowX: "auto" as const,
        fontSize: "0.85em",
      },
    },
  },
  blockquote: {
    props: {
      style: {
        borderLeft: `3px solid ${t.color.border}`,
        paddingLeft: 14,
        color: t.color.muted,
        margin: "14px 0",
      },
    },
  },
  table: {
    props: {
      style: {
        borderCollapse: "collapse" as const,
        width: "100%",
        margin: "14px 0",
        fontSize: "0.92em",
      },
    },
  },
  th: {
    props: {
      style: {
        border: `1px solid ${t.color.border}`,
        padding: "6px 10px",
        textAlign: "left" as const,
        verticalAlign: "top" as const,
        background: t.color.surface,
      },
    },
  },
  td: {
    props: {
      style: {
        border: `1px solid ${t.color.border}`,
        padding: "6px 10px",
        textAlign: "left" as const,
        verticalAlign: "top" as const,
      },
    },
  },
};

export function MarkdownPage({ content }: { content: string }) {
  return (
    <main
      style={{
        fontFamily: t.font,
        color: t.color.body,
        background: t.color.bg,
        padding: "48px 32px 96px",
      }}
    >
      <article
        style={{
          maxWidth: t.bodyMaxWidth,
          margin: "0 auto",
          fontSize: t.bodyFontSize,
          lineHeight: t.bodyLineHeight,
        }}
      >
        <Markdown options={{ overrides }}>{content}</Markdown>
      </article>
    </main>
  );
}

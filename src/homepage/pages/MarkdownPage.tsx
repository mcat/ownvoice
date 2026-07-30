import Markdown from "markdown-to-jsx";
import { Footer } from "../sections/Footer";
import { homepageTheme as t } from "../theme";

/**
 * Shared long-form-markdown page wrapper. Used by /research and
 * /bibliography to render their respective `docs/*.md` files with
 * consistent editorial typography. The `<Markdown>` component from
 * markdown-to-jsx parses the markdown AST and emits real Preact
 * VNodes — no string-to-DOM shortcut, so the security model is the
 * same as ordinary JSX.
 *
 * Closes with the shared <Footer /> so every non-app route carries the
 * same disclaimer, cross-links, and author attribution.
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

export function MarkdownPage({
  content,
  breadcrumbCurrent,
}: {
  content: string;
  /** Label for the current page in the breadcrumb trail. When provided,
   *  a "Home / <breadcrumbCurrent>" nav renders above the article. */
  breadcrumbCurrent?: string;
}) {
  return (
    <div style={{ fontFamily: t.font, background: t.color.bg }}>
      <main
        style={{
          color: t.color.body,
          padding: "48px 32px 96px",
        }}
      >
        <div
          style={{
            maxWidth: t.bodyMaxWidth,
            margin: "0 auto",
          }}
        >
          {breadcrumbCurrent ? (
            <nav
              aria-label="Breadcrumb"
              style={{ marginBottom: 24, fontSize: 13 }}
            >
              <ol
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 8,
                  listStyle: "none",
                  padding: 0,
                  margin: 0,
                  color: t.color.muted,
                }}
              >
                <li>
                  <a
                    href="/"
                    style={{
                      color: t.color.muted,
                      textDecoration: "underline",
                      textUnderlineOffset: 2,
                    }}
                  >
                    Home
                  </a>
                </li>
                <li aria-hidden="true">/</li>
                <li aria-current="page" style={{ color: t.color.body }}>
                  {breadcrumbCurrent}
                </li>
              </ol>
            </nav>
          ) : null}
          <article
            style={{
              fontSize: t.bodyFontSize,
              lineHeight: t.bodyLineHeight,
            }}
          >
            <Markdown options={{ overrides }}>{content}</Markdown>
          </article>
        </div>
      </main>
      <Footer />
    </div>
  );
}

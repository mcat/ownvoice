import researchMd from "../../../docs/ownvoice-research-plan.md?raw";
import { MarkdownPage } from "./MarkdownPage";

/**
 * The research page at `/research`. Source of truth is
 * `docs/ownvoice-research-plan.md` — imported via Vite's `?raw` query
 * and rendered through the shared <MarkdownPage> wrapper.
 *
 * Headings get auto-generated IDs by markdown-to-jsx so external links
 * can deep-link to specific sections (e.g. /research#abstract).
 */
export function Research() {
  return <MarkdownPage content={researchMd} breadcrumbCurrent="Research plan" />;
}

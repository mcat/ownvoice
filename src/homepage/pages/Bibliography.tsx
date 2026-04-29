import bibliographyMd from "../../../docs/BIBLIOGRAPHY.md?raw";
import { MarkdownPage } from "./MarkdownPage";

/**
 * The applied-research bibliography at `/bibliography`. Source of truth
 * is `docs/BIBLIOGRAPHY.md` — imported via Vite's `?raw` query and
 * rendered through the shared <MarkdownPage> wrapper.
 *
 * Citations have been Crossref-verified (see commit 60cda93). Most
 * journal articles link to a DOI; books and organizational reports
 * link to publisher pages where findable.
 */
export function Bibliography() {
  return <MarkdownPage content={bibliographyMd} breadcrumbCurrent="Bibliography" />;
}

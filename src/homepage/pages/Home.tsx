import { Hero } from "../sections/Hero";
import { TheProblem } from "../sections/TheProblem";
import { TheStakes } from "../sections/TheStakes";
import { TheSystem } from "../sections/TheSystem";
import { StudyAtAGlance } from "../sections/StudyAtAGlance";
import { OnDeviceAndPrivacy } from "../sections/OnDeviceAndPrivacy";
import { References } from "../sections/References";
import { CommercialOpportunity } from "../sections/CommercialOpportunity";
import { CTA } from "../sections/CTA";
import { Footer } from "../sections/Footer";
import { homepageTheme as t } from "../theme";

/**
 * The homepage at `/`. Composes the sections in scroll order:
 * hero → problem → stakes → system → study → privacy → references →
 * commercial opportunity → CTA → footer.
 * No layout logic of its own — each section owns its padding and width.
 *
 * <Footer /> sits outside <main> deliberately: a <footer> scoped to main
 * maps to `sectionfooter`, not the `contentinfo` landmark, so nesting it
 * would drop the footer out of screen-reader landmark navigation.
 */
export function Home() {
  return (
    <>
      <main style={{ fontFamily: t.font, color: t.color.text, background: t.color.bg }}>
        <Hero />
        <TheProblem />
        <TheStakes />
        <TheSystem />
        <StudyAtAGlance />
        <OnDeviceAndPrivacy />
        <References />
        <CommercialOpportunity />
        <CTA />
      </main>
      <Footer />
    </>
  );
}

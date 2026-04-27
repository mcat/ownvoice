import { Hero } from "../sections/Hero";
import { TheProblem } from "../sections/TheProblem";
import { TheSystem } from "../sections/TheSystem";
import { StudyAtAGlance } from "../sections/StudyAtAGlance";
import { OnDeviceAndPrivacy } from "../sections/OnDeviceAndPrivacy";
import { References } from "../sections/References";
import { CTA } from "../sections/CTA";
import { Footer } from "../sections/Footer";
import { homepageTheme as t } from "../theme";

/**
 * The homepage at `/`. Composes the eight sections in scroll order:
 * hero → problem → system → study → privacy → references → CTA → footer.
 * No layout logic of its own — each section owns its padding and width.
 */
export function Home() {
  return (
    <main style={{ fontFamily: t.font, color: t.color.text, background: t.color.bg }}>
      <Hero />
      <TheProblem />
      <TheSystem />
      <StudyAtAGlance />
      <OnDeviceAndPrivacy />
      <References />
      <CTA />
      <Footer />
    </main>
  );
}

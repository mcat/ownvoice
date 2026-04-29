import { LocationProvider, Router, Route } from "preact-iso";
import { Home } from "./pages/Home";
import { Research } from "./pages/Research";
import { Bibliography } from "./pages/Bibliography";

/**
 * Top-level component for the homepage entry. Routes:
 *   /              → <Home />
 *   /research      → <Research />
 *   /bibliography  → <Bibliography />
 *
 * `scope` excludes `/app/*` so the "Set up a patient" link
 * triggers a real cross-document navigation to the app entry instead
 * of being SPA-hijacked into a no-match (blank) render.
 */
const ROUTER_SCOPE = /^(?!\/app(?:$|\/))/;

export function HomepageApp() {
  return (
    <LocationProvider scope={ROUTER_SCOPE}>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/research" component={Research} />
        <Route path="/bibliography" component={Bibliography} />
      </Router>
    </LocationProvider>
  );
}

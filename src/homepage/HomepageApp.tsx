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
 * Anything else 404s — the homepage entry doesn't own /app/* (that's
 * a separate Vite entry served from /app/index.html), and we don't
 * have any other top-level routes.
 */
export function HomepageApp() {
  return (
    <LocationProvider>
      <Router>
        <Route path="/" component={Home} />
        <Route path="/research" component={Research} />
        <Route path="/bibliography" component={Bibliography} />
      </Router>
    </LocationProvider>
  );
}

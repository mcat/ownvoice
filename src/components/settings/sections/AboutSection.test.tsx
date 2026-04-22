import { render, screen, waitFor } from "@testing-library/preact";
import { AboutSection } from "./AboutSection";
import { light } from "../../../theme/tokens";

describe("AboutSection", () => {
  // Restore the mock's default in afterEach so one test's cache contents
  // don't leak into the next. The global mock in src/__tests__/setup.ts
  // installs an empty-keys variant; tests override per-test where needed.
  afterEach(() => {
    vi.mocked(caches.keys).mockResolvedValue([]);
  });

  it("renders the static version + attribution lines", () => {
    render(<AboutSection t={light} />);
    expect(screen.getByText("OwnVoice v0.1")).toBeInTheDocument();
    expect(
      screen.getByText(/Emoji-FPS \(Li et al\., JMIR 2023\)/),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/SICG \(Ariadne Labs\)/),
    ).toBeInTheDocument();
  });

  it("displays ownvoice-* cache names from caches.keys()", async () => {
    // The "is my SW update actually live on this device?" signal that
    // made this component dynamic. caches.keys() returns every cache
    // the origin has stored; during a SW rotation there can be multiple
    // — the row should show them sorted so the clinician can see what's
    // resident without opening DevTools.
    vi.mocked(caches.keys).mockResolvedValue([
      "ownvoice-v7",
      "ownvoice-v8",
      "unrelated-cache",
    ]);
    render(<AboutSection t={light} />);
    const row = await screen.findByTestId("about-sw-caches");
    expect(row).toHaveTextContent("SW cache: ownvoice-v7, ownvoice-v8");
    // "unrelated-cache" must not leak into the display — we filter by
    // prefix so other origins sharing the browser's Cache API don't
    // pollute the signal.
    expect(row).not.toHaveTextContent("unrelated-cache");
  });

  it("does not render the SW cache row when no ownvoice-* caches exist", async () => {
    // Paranoia case: on a freshly-installed browser with no SW yet, or
    // if caches.keys() rejects (private browsing, CSP, etc.), the
    // component must not render a confusing empty "SW cache: " line.
    vi.mocked(caches.keys).mockResolvedValue(["other-app-cache"]);
    render(<AboutSection t={light} />);
    // Wait one tick so the effect's promise resolves; then confirm the
    // element is absent (not "present with empty content").
    await waitFor(() => {
      expect(screen.queryByTestId("about-sw-caches")).toBeNull();
    });
  });

  it("handles caches.keys() rejection without throwing", async () => {
    vi.mocked(caches.keys).mockRejectedValue(new Error("private mode"));
    render(<AboutSection t={light} />);
    // Allow microtasks to flush so the rejected promise's catch runs.
    await new Promise((r) => setTimeout(r, 0));
    expect(screen.queryByTestId("about-sw-caches")).toBeNull();
    // Static content is still rendered — catch swallowed the error
    // rather than crashing the whole settings panel.
    expect(screen.getByText("OwnVoice v0.1")).toBeInTheDocument();
  });
});

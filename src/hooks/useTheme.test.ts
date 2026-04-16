import { renderHook, act } from "@testing-library/preact";
import { useTheme } from "./useTheme";
import { useUIStore } from "../stores/uiStore";
import { light, dark } from "../theme/tokens";
import type { ThemeName } from "../theme/tokens";

// Helper: set up matchMedia mock
function mockMatchMedia(prefersDark: boolean) {
  Object.defineProperty(window, "matchMedia", {
    value: vi.fn((query: string) => ({
      matches: prefersDark && query === "(prefers-color-scheme: dark)",
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      onchange: null,
      dispatchEvent: vi.fn(),
    })),
    writable: true,
  });
}

// Resync uiStore with current localStorage + matchMedia (the store evaluates
// these once at module load, so tests that change them must re-seed the store).
function resyncUIStore() {
  const saved = localStorage.getItem("ov-theme");
  const override: ThemeName | null =
    saved === "light" || saved === "dark" ? saved : null;
  useUIStore.setState({
    themeOverride: override,
    systemDark: window.matchMedia("(prefers-color-scheme: dark)").matches,
  });
}

beforeEach(() => {
  localStorage.clear();
  // Provide a default matchMedia (light preference)
  mockMatchMedia(false);
  // Reset classList.toggle so it doesn't leak between tests
  document.documentElement.classList.remove("dark");
  resyncUIStore();
});

describe("useTheme", () => {
  describe("default theme", () => {
    it("defaults to light when system prefers light", () => {
      mockMatchMedia(false);
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("light");
      expect(result.current.t).toEqual(light);
    });

    it("defaults to dark when system prefers dark", () => {
      mockMatchMedia(true);
      resyncUIStore();
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");
      expect(result.current.t).toEqual(dark);
    });
  });

  describe("localStorage persistence", () => {
    it("reads saved theme from localStorage", () => {
      localStorage.setItem("ov-theme", "dark");
      resyncUIStore();
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");
    });

    it("persists theme to localStorage on change", () => {
      const { result } = renderHook(() => useTheme());
      act(() => {
        result.current.toggle();
      });
      expect(localStorage.getItem("ov-theme")).toBe("dark");
    });

    it("ignores invalid saved theme values", () => {
      localStorage.setItem("ov-theme", "neon");
      mockMatchMedia(false);
      resyncUIStore();
      const { result } = renderHook(() => useTheme());
      // Falls through to matchMedia
      expect(result.current.theme).toBe("light");
    });
  });

  describe("toggle()", () => {
    it("switches from light to dark", () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("light");

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe("dark");
      expect(result.current.t).toEqual(dark);
    });

    it("switches from dark back to light", () => {
      localStorage.setItem("ov-theme", "dark");
      resyncUIStore();
      const { result } = renderHook(() => useTheme());
      expect(result.current.theme).toBe("dark");

      act(() => {
        result.current.toggle();
      });

      expect(result.current.theme).toBe("light");
      expect(result.current.t).toEqual(light);
    });

    it("adds/removes dark class on document element", () => {
      const { result } = renderHook(() => useTheme());
      expect(document.documentElement.classList.contains("dark")).toBe(false);

      act(() => {
        result.current.toggle();
      });
      expect(document.documentElement.classList.contains("dark")).toBe(true);

      act(() => {
        result.current.toggle();
      });
      expect(document.documentElement.classList.contains("dark")).toBe(false);
    });
  });

  describe("t token set", () => {
    it("returns light tokens when theme is light", () => {
      const { result } = renderHook(() => useTheme());
      expect(result.current.t.bg).toBe(light.bg);
      expect(result.current.t.card).toBe(light.card);
    });

    it("returns dark tokens when theme is dark", () => {
      localStorage.setItem("ov-theme", "dark");
      resyncUIStore();
      const { result } = renderHook(() => useTheme());
      expect(result.current.t.bg).toBe(dark.bg);
      expect(result.current.t.card).toBe(dark.card);
    });
  });
});

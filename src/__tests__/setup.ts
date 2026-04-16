import "fake-indexeddb/auto";
import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/preact";
import { afterEach, vi } from "vitest";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

// --- Global API mocks ---

// uiStore reads prefers-color-scheme at module load
Object.defineProperty(window, "matchMedia", {
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
  writable: true,
});

// SpeechSynthesisUtterance
class MockUtterance {
  text = "";
  rate = 1;
  volume = 1;
  voice: unknown = null;
  onend: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onstart: (() => void) | null = null;
  constructor(text?: string) {
    if (text) this.text = text;
  }
}
Object.defineProperty(globalThis, "SpeechSynthesisUtterance", {
  value: MockUtterance,
  writable: true,
});

// speechSynthesis
Object.defineProperty(globalThis, "speechSynthesis", {
  value: {
    speak: vi.fn(),
    cancel: vi.fn(),
    resume: vi.fn(),
    getVoices: vi.fn(() => []),
    speaking: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  },
  writable: true,
});

// AudioContext
const mockAudioContext = () => ({
  createBuffer: vi.fn(() => ({
    getChannelData: vi.fn(() => new Float32Array(16000)),
  })),
  createBufferSource: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    onended: null as (() => void) | null,
    buffer: null,
  })),
  createOscillator: vi.fn(() => ({
    connect: vi.fn(),
    start: vi.fn(),
    stop: vi.fn(),
    type: "",
    frequency: { value: 0 },
  })),
  createGain: vi.fn(() => ({
    connect: vi.fn(),
    gain: {
      setValueAtTime: vi.fn(),
      exponentialRampToValueAtTime: vi.fn(),
    },
  })),
  destination: {},
  currentTime: 0,
  state: "running" as AudioContextState,
  resume: vi.fn(),
  close: vi.fn(),
  decodeAudioData: vi.fn(),
  sampleRate: 24000,
});
Object.defineProperty(globalThis, "AudioContext", {
  value: vi.fn(mockAudioContext),
  writable: true,
});

// Cache API — jsdom doesn't provide this; resetAll() uses `"caches" in self`
// guard in source but tests may reference `caches` directly.
Object.defineProperty(globalThis, "caches", {
  value: {
    keys: vi.fn(async () => []),
    delete: vi.fn(async () => true),
    open: vi.fn(),
    has: vi.fn(async () => false),
    match: vi.fn(),
  },
  writable: true,
  configurable: true,
});

// navigator.mediaDevices.getUserMedia
if (!navigator.mediaDevices) {
  Object.defineProperty(navigator, "mediaDevices", {
    value: { getUserMedia: vi.fn() },
    writable: true,
  });
} else {
  navigator.mediaDevices.getUserMedia = vi.fn();
}

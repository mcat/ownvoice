import { t as resolvePhrase } from "./phraseRegistry";

/**
 * Translate a raw error message into something a non-technical user can act on.
 * The raw message is still useful for logs and for developers reading the
 * console, but it should never be the user-facing copy — `Failed to fetch` and
 * similar native strings mean nothing at the bedside.
 *
 * Used by VoiceCapture (cloning errors) and useMicrophone (Listen errors).
 */
export function friendlyVoiceError(raw: string, locale = "en"): string {
  const m = raw.toLowerCase();
  if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("network")) {
    return resolvePhrase("ui.provider.voice_capture.err_network", locale);
  }
  if (m.includes("timed out") || m.includes("timeout") || m.includes("taking longer")) {
    return resolvePhrase("ui.provider.voice_capture.err_timeout", locale);
  }
  if (m.includes("denied") || m.includes("permission") || m.includes("notallowed")) {
    return resolvePhrase("ui.provider.voice_capture.err_mic_denied", locale);
  }
  if (m.includes("too short")) {
    return resolvePhrase("ui.provider.voice_capture.err_too_short", locale);
  }
  if (m.includes("too noisy") || m.includes("snr")) {
    return resolvePhrase("ui.provider.voice_capture.err_too_noisy", locale);
  }
  return resolvePhrase("ui.provider.voice_capture.err_generic", locale);
}

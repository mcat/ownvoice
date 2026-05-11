/**
 * AudioWorklet processor that streams raw mono Float32 samples back to the
 * main thread for STT batching.
 *
 * Replaces the deprecated ScriptProcessorNode pipeline that previously
 * lived in useMicrophone.ts. ScriptProcessorNode runs on the main thread
 * and is being removed from browsers; AudioWorkletProcessor runs on the
 * dedicated audio thread, so callbacks aren't blocked by main-thread
 * work and audio doesn't drop frames.
 *
 * Protocol:
 *   - Worklet → main:  { type: "samples", samples: Float32Array }
 *   - Main → worklet:  { type: "stop" }  // returns false from process()
 *
 * The samples buffer is COPIED before posting (not transferred) so the
 * worklet can keep filling its own internal AudioWorklet buffer without
 * tripping the detached-ArrayBuffer trap.
 */
class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.alive = true;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === "stop") {
        this.alive = false;
      }
    };
  }

  process(inputs) {
    if (!this.alive) return false;
    const input = inputs[0];
    if (input && input.length > 0 && input[0] && input[0].length > 0) {
      const src = input[0];
      const copy = new Float32Array(src.length);
      copy.set(src);
      this.port.postMessage({ type: "samples", samples: copy });
    }
    return true;
  }
}

registerProcessor("audio-capture", AudioCaptureProcessor);

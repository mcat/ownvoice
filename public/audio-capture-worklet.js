/**
 * AudioWorklet processor that streams raw mono Float32 samples back to the
 * main thread for STT batching.
 *
 * Replaces the deprecated ScriptProcessorNode pipeline. AudioWorkletProcessor
 * runs on the dedicated audio thread, so callbacks aren't blocked by main-
 * thread work and audio doesn't drop frames.
 *
 * Protocol:
 *   - Worklet → main:  { type: "samples", samples: Float32Array }  (~7-8 Hz)
 *   - Main → worklet:  { type: "stop" }  // returns false from process()
 *
 * Batching: `process()` is called once per 128-sample render quantum
 * (~2.7ms at 48 kHz, ~375 calls/sec). Posting that fast caused unbounded
 * heap growth on the main thread (tens of thousands of tiny Float32Array
 * allocations piling up in the consumer's accumulator until GC pauses
 * froze the tab after a few minutes). We accumulate BATCH_QUANTA quanta
 * (~134ms of audio at 48 kHz) into a single Float32Array before posting,
 * cutting allocation/message rate by ~50× without losing fidelity — the
 * downstream RMS meter still updates 7-8 times/sec, and the STT pipeline
 * is rate-agnostic since it concatenates everything on stop anyway.
 *
 * The accumulator is COPIED before posting (not transferred) so the
 * worklet can keep filling a fresh buffer without tripping the detached-
 * ArrayBuffer trap.
 */
const QUANTUM_SIZE = 128;
const BATCH_QUANTA = 50; // 50 × 128 = 6400 samples ≈ 134ms at 48 kHz
const BATCH_SIZE = QUANTUM_SIZE * BATCH_QUANTA;

class AudioCaptureProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.alive = true;
    this.buffer = new Float32Array(BATCH_SIZE);
    this.bufferIdx = 0;
    this.port.onmessage = (e) => {
      if (e.data && e.data.type === "stop") {
        this.alive = false;
        this.flush();
      }
    };
  }

  flush() {
    if (this.bufferIdx === 0) return;
    const copy = new Float32Array(this.bufferIdx);
    copy.set(this.buffer.subarray(0, this.bufferIdx));
    this.port.postMessage({ type: "samples", samples: copy });
    this.bufferIdx = 0;
  }

  process(inputs) {
    if (!this.alive) return false;
    const input = inputs[0];
    if (input && input.length > 0 && input[0] && input[0].length > 0) {
      const src = input[0];
      // Copy this quantum into the batch buffer. If the buffer fills,
      // post and reset before continuing — the audio thread keeps
      // running regardless of main-thread responsiveness.
      let srcOff = 0;
      while (srcOff < src.length) {
        const space = BATCH_SIZE - this.bufferIdx;
        const take = Math.min(space, src.length - srcOff);
        this.buffer.set(src.subarray(srcOff, srcOff + take), this.bufferIdx);
        this.bufferIdx += take;
        srcOff += take;
        if (this.bufferIdx >= BATCH_SIZE) this.flush();
      }
    }
    return true;
  }
}

registerProcessor("audio-capture", AudioCaptureProcessor);

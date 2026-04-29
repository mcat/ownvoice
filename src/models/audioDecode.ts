/** Decode a base64 audio blob into a 24 kHz mono Float32Array.
 *  Same target sample rate as VoiceCapture's existing decodeAudio. */
export async function decodeAudioFromBase64(
  base64: string,
): Promise<Float32Array> {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const ctx = new AudioContext({ sampleRate: 24000 });
  const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
  const channelData = audioBuffer.getChannelData(0);
  ctx.close();
  return new Float32Array(channelData);
}

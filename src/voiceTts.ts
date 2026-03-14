/**
 * Text-to-speech for Inner World Model.
 * Play voice_reflection and next_question in headset.
 * Implement one of: Sesame CSM (DeepInfra/Vapi) or ElevenLabs.
 * Stub: uses browser SpeechSynthesis as fallback for quick dev.
 */

import { TTS_API_KEY } from "./config.js";

/**
 * Speaks the given text via TTS and returns a Promise that resolves when playback finishes.
 * Replace the implementation with Sesame (DeepInfra) or ElevenLabs for production.
 */
export function speak(text: string): Promise<void> {
  // Fallback: browser SpeechSynthesis (no API key; works everywhere for dev)
  if (!window.speechSynthesis) {
    console.warn("[voiceTts] speechSynthesis not available");
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const u = new SpeechSynthesisUtterance(text);
    u.onend = () => resolve();
    u.onerror = (e) => reject(e);
    window.speechSynthesis.speak(u);
  });
}

/**
 * Optional: fetch audio from Sesame/DeepInfra or ElevenLabs and play via Audio element.
 * Use when you have TTS_API_KEY and want higher quality / Sesame voice.
 */
export async function speakWithApi(text: string): Promise<void> {
  if (!TTS_API_KEY) {
    return speak(text);
  }
  // TODO: POST text to DeepInfra Sesame or ElevenLabs; get audio URL or blob; play.
  // Example (pseudo): const audioUrl = await fetchSesameAudio(text); const a = new Audio(audioUrl); a.play(); await onEnd(a);
  return speak(text);
}

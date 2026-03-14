/**
 * Speech-to-text for Inner World Model.
 * Uses the browser Web Speech API (works in Chrome/Edge and often in PICO Browser).
 * Fallback: return empty or use a "type your response" UI for demo if STT is unavailable.
 */

/** Result of a single recognition (interim or final). */
export interface SttResult {
  transcript: string;
  isFinal: boolean;
}

/** Callback for each STT result. When isFinal is true, that's the committed transcript. */
export type SttCallback = (result: SttResult) => void;

/**
 * Starts listening and reports transcripts via the callback.
 * Returns a stop function. Call it when the user is done speaking.
 * Requires secure context (HTTPS) and user permission for microphone.
 */
export function startListening(callback: SttCallback): () => void {
  const SpeechRecognition =
    (typeof window !== "undefined" &&
      (window as unknown as { SpeechRecognition?: typeof window.SpeechRecognition & (new () => unknown) }).SpeechRecognition) ||
    (window as unknown as { webkitSpeechRecognition?: typeof window.SpeechRecognition & (new () => unknown) }).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    console.warn("[voiceStt] Web Speech API not available; use fallback input.");
    callback({ transcript: "", isFinal: true });
    return () => {};
  }

  const recognition = new SpeechRecognition() as {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: { results: Iterable<{ isFinal: boolean; [i: number]: { transcript: string } }> }) => void;
    onerror: (event: { error: string }) => void;
    start: () => void;
    stop: () => void;
  };
  recognition.continuous = true;
  recognition.interimResults = true;

  recognition.onresult = (event: { results: Iterable<{ isFinal: boolean; length: number; [i: number]: { transcript: string } }> }) => {
    const results = Array.from(event.results);
    const last = results[results.length - 1];
    if (!last) return;
    const transcript = Array.from({ length: last.length }, (_, i) => (last as { [i: number]: { transcript: string } })[i]?.transcript ?? "")
      .join("")
      .trim();
    callback({ transcript, isFinal: last.isFinal });
  };

  recognition.onerror = (event: { error: string }) => {
    console.error("[voiceStt]", event.error);
  };

  recognition.start();
  return () => recognition.stop();
}

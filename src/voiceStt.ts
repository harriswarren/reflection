/**
 * Speech-to-text for Inner World Model.
 * Uses the browser Web Speech API (works in Chrome/Edge and often in PICO Browser).
 * Falls back to error reporting if STT is unavailable.
 */

export interface SttResult {
  transcript: string;
  isFinal: boolean;
}

export type SttCallback = (result: SttResult) => void;

/** Error callback for when the STT engine encounters a problem. */
export type SttErrorCallback = (error: string) => void;

/**
 * Checks whether the browser supports speech recognition AND we're in a
 * secure context (HTTPS / localhost). Returns a diagnostic object.
 */
export function checkSttSupport(): { supported: boolean; reason: string } {
  // Secure context is required for mic access
  if (typeof window === "undefined") {
    return { supported: false, reason: "No window object (SSR?)" };
  }
  if (!window.isSecureContext) {
    return {
      supported: false,
      reason: "Not a secure context (need HTTPS). Current URL: " + location.protocol + "//" + location.host,
    };
  }

  const SR = getSpeechRecognitionConstructor();
  if (!SR) {
    return {
      supported: false,
      reason: "SpeechRecognition API not available in this browser. Try Chrome or Edge.",
    };
  }

  return { supported: true, reason: "OK" };
}

/**
 * Requests microphone permission explicitly so we can surface denial early.
 * Returns true if granted, false if denied/error.
 */
export async function requestMicPermission(): Promise<{ granted: boolean; reason: string }> {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    // Got permission — stop the stream immediately, we just needed the permission
    stream.getTracks().forEach((t) => t.stop());
    return { granted: true, reason: "Mic access granted" };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { granted: false, reason: "Mic permission denied: " + msg };
  }
}

/**
 * Starts listening and reports transcripts via the callback.
 * Returns a stop function. Call it when the user is done speaking.
 * Requires secure context (HTTPS) and user permission for microphone.
 *
 * @param onError  Optional callback for error events from the recogniser.
 */
export function startListening(callback: SttCallback, onError?: SttErrorCallback): () => void {
  const SR = getSpeechRecognitionConstructor();

  if (!SR) {
    console.warn("[voiceStt] Web Speech API not available; use fallback input.");
    onError?.("SpeechRecognition API not available");
    callback({ transcript: "", isFinal: true });
    return () => {};
  }

  const recognition = new SR() as {
    continuous: boolean;
    interimResults: boolean;
    onresult: (event: { results: Iterable<{ isFinal: boolean; [i: number]: { transcript: string } }> }) => void;
    onerror: (event: { error: string }) => void;
    onstart: () => void;
    onend: () => void;
    start: () => void;
    stop: () => void;
  };
  recognition.continuous = true;
  recognition.interimResults = true;

  let stopped = false;

  recognition.onstart = () => {
    console.log("[voiceStt] Recognition started — mic is live");
  };

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
    console.error("[voiceStt] error:", event.error);
    onError?.(event.error);
  };

  recognition.onend = () => {
    // Web Speech API sometimes stops on its own (network error, silence, etc.)
    // Restart if we haven't been explicitly stopped.
    if (!stopped) {
      console.log("[voiceStt] Recognition ended unexpectedly — restarting");
      try {
        recognition.start();
      } catch (_) {
        // Ignore if already started
      }
    }
  };

  try {
    recognition.start();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[voiceStt] Failed to start:", msg);
    onError?.("Failed to start recognition: " + msg);
  }

  return () => {
    stopped = true;
    try {
      recognition.stop();
    } catch (_) {
      // already stopped
    }
  };
}

function getSpeechRecognitionConstructor(): (new () => unknown) | null {
  if (typeof window === "undefined") return null;
  return (
    (window as unknown as { SpeechRecognition?: new () => unknown }).SpeechRecognition ||
    (window as unknown as { webkitSpeechRecognition?: new () => unknown }).webkitSpeechRecognition ||
    null
  );
}

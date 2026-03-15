/**
 * Conversation Manager for Inner World Model.
 *
 * Flow:
 *   1. Continuously listen for wake word "Hello World Model"
 *   2. Once detected → greet user, ask an emotion-probing question
 *   3. Listen for user's full response (silence timeout = end of turn)
 *   4. Send transcript to Brain API → get cognitive state scores
 *   5. If dominant state score >= CONFIDENCE_THRESHOLD → switch splat scene
 *   6. Speak voice_reflection, then next_question
 *   7. Repeat 3-6 for several turns, or until user says goodbye
 *
 * Uses Pico 4 microphone via Web Speech API (same mic the browser uses).
 */

import { infer, type BrainInferResponse } from "./brainClient.js";
import { startListening, checkSttSupport, requestMicPermission } from "./voiceStt.js";
import { speak } from "./voiceTts.js";
import { switchSplatTo, type SplatStateName } from "./splatSwitcher.js";

// Minimum score for the dominant state to trigger a scene change.
// Below this, we stay in the current scene (avoids flicker on ambiguous input).
const CONFIDENCE_THRESHOLD = 0.55;

const MAX_TURNS = 5;

const WAKE_PHRASE = "hello world model";

// Opening questions designed to surface different emotions.
// The Brain will generate follow-ups, but these kick off the conversation.
const OPENING_QUESTIONS = [
  "Think about a recent disagreement you had with someone. What was it about, and how did you feel during it?",
  "Tell me about a moment recently where you felt misunderstood. What happened?",
  "Describe a situation where you felt under pressure to respond quickly. How did you handle it?",
  "Is there something you've been curious about lately that you haven't had time to explore?",
  "Think of a time when you changed your mind about something important. What led to that shift?",
];

export interface ConversationCallbacks {
  /** Fired when diagnostics pass and the system begins listening for wake word. */
  onReady?: () => void;
  onWakeWordDetected?: () => void;
  onListening?: () => void;
  onProcessing?: () => void;
  onSpeaking?: () => void;
  /** Called with interim/final transcript so UI can show what the mic hears. */
  onTranscript?: (text: string, isFinal: boolean) => void;
  onSceneChange?: (state: SplatStateName, confidence: number) => void;
  onTurnComplete?: (turn: number) => void;
  onConversationEnd?: () => void;
  onError?: (error: Error) => void;
  /** Fired with a diagnostic/error string for display on the HUD. */
  onDiagnostic?: (message: string) => void;
}

/**
 * Start listening for the wake word. Once detected, runs the
 * conversation loop (question → listen → infer → scene change → repeat).
 * Returns a cleanup function that stops everything.
 *
 * Runs startup diagnostics first:
 *  1. Checks secure context (HTTPS)
 *  2. Checks SpeechRecognition API availability
 *  3. Requests microphone permission
 * If any fail, fires onError + onDiagnostic so the HUD shows what's wrong.
 */
export function startVoiceConversation(callbacks?: ConversationCallbacks): () => void {
  let stopped = false;
  let stopCurrentListener: (() => void) | null = null;

  // Run async diagnostics then begin listening
  (async () => {
    // --- Step 1: Check browser support ---
    const support = checkSttSupport();
    if (!support.supported) {
      console.error("[Conversation] STT not supported:", support.reason);
      callbacks?.onDiagnostic?.(support.reason);
      callbacks?.onError?.(new Error(support.reason));
      return;
    }
    console.log("[Conversation] STT support check passed");

    // --- Step 2: Request mic permission ---
    callbacks?.onDiagnostic?.("Requesting mic permission...");
    const mic = await requestMicPermission();
    if (!mic.granted) {
      console.error("[Conversation] Mic denied:", mic.reason);
      callbacks?.onDiagnostic?.(mic.reason);
      callbacks?.onError?.(new Error(mic.reason));
      return;
    }
    console.log("[Conversation] Mic permission granted");

    if (stopped) return;

    // --- Step 3: Begin wake word listening ---
    callbacks?.onReady?.();
    callbacks?.onDiagnostic?.("");
    console.log("[Conversation] Listening for wake word: \"Hello World Model\"");
    beginWakeWordListening();
  })().catch((err) => {
    console.error("[Conversation] Startup error:", err);
    callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
    callbacks?.onDiagnostic?.("Startup error: " + String(err));
  });

  function beginWakeWordListening(): void {
    if (stopped) return;
    stopCurrentListener = startListening(
      (result) => {
        if (stopped) return;
        const text = result.transcript.toLowerCase();
        callbacks?.onTranscript?.(result.transcript, result.isFinal);

        if (text.includes(WAKE_PHRASE)) {
          console.log("[Conversation] Wake word detected!");
          callbacks?.onWakeWordDetected?.();
          stopCurrentListener?.();
          stopCurrentListener = null;
          runConversationLoop(callbacks).catch((err) => {
            console.error("[Conversation] Loop error:", err);
            callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
          }).finally(() => {
            if (!stopped) {
              console.log("[Conversation] Returning to wake word listening.");
              callbacks?.onConversationEnd?.();
              beginWakeWordListening();
            }
          });
        }
      },
      // STT error callback — surface to HUD
      (sttError) => {
        console.error("[Conversation] STT error:", sttError);
        callbacks?.onDiagnostic?.("STT: " + sttError);
        callbacks?.onError?.(new Error("STT: " + sttError));
      },
    );
  }

  return () => {
    stopped = true;
    stopCurrentListener?.();
    stopCurrentListener = null;
  };
}

async function runConversationLoop(callbacks?: ConversationCallbacks): Promise<void> {
  // Pick a random opening question
  const openingQ = OPENING_QUESTIONS[Math.floor(Math.random() * OPENING_QUESTIONS.length)];

  callbacks?.onSpeaking?.();
  await speak("Hello. I'm your world model. Let's explore something together.");
  await speak(openingQ);

  let previousQuestion = openingQ;
  let turn = 0;

  while (turn < MAX_TURNS) {
    // Listen for user's response
    callbacks?.onListening?.();
    const transcript = await listenForResponse(callbacks);

    if (!transcript.trim()) {
      console.log("[Conversation] Empty response, ending conversation.");
      break;
    }

    // Check for goodbye
    const lower = transcript.toLowerCase();
    if (lower.includes("goodbye") || lower.includes("bye") || lower.includes("end session")) {
      await speak("Thank you for sharing. Take care.");
      break;
    }

    // Send to Brain for cognitive analysis
    callbacks?.onProcessing?.();
    console.log("[Conversation] Processing: \"" + transcript.substring(0, 80) + "...\"");

    let result: BrainInferResponse;
    try {
      result = await infer(transcript);
    } catch (e) {
      console.error("[Conversation] Brain API error:", e);
      callbacks?.onError?.(e instanceof Error ? e : new Error(String(e)));
      await speak("I had trouble processing that. Could you try again?");
      continue;
    }

    console.log("[Conversation] Brain result: " + result.dominant_state +
      " (reflection=" + result.states.reflection.toFixed(2) +
      " defensiveness=" + result.states.defensiveness.toFixed(2) +
      " curiosity=" + result.states.curiosity.toFixed(2) +
      " stress=" + result.states.stress.toFixed(2) + ")");

    // Switch scene if confidence is above threshold
    const dominantScore = result.states[result.dominant_state as keyof typeof result.states];
    if (dominantScore >= CONFIDENCE_THRESHOLD) {
      const newState = result.dominant_state as SplatStateName;
      console.log("[Conversation] Scene change → " + newState + " (score=" + dominantScore.toFixed(2) + ")");
      switchSplatTo(newState);
      callbacks?.onSceneChange?.(newState, dominantScore);
    } else {
      console.log("[Conversation] Score " + dominantScore.toFixed(2) +
        " below threshold " + CONFIDENCE_THRESHOLD + ", keeping current scene.");
    }

    // Speak reflection and follow-up question
    callbacks?.onSpeaking?.();
    if (result.voice_reflection) {
      await speak(result.voice_reflection);
    }
    if (result.next_question) {
      await speak(result.next_question);
      previousQuestion = result.next_question;
    }

    turn++;
    callbacks?.onTurnComplete?.(turn);
  }

  // Return to neutral scene when conversation ends
  switchSplatTo("neutral");
  callbacks?.onConversationEnd?.();
}

/**
 * Listen until the user finishes speaking (final transcript from Web Speech API).
 * A 10-second silence timeout ends the turn.
 */
function listenForResponse(callbacks?: ConversationCallbacks): Promise<string> {
  return new Promise((resolve) => {
    let finalTranscript = "";
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    const SILENCE_TIMEOUT_MS = 10_000;

    const stop = startListening(
      (result) => {
        // Reset silence timer on any speech
        if (silenceTimer) clearTimeout(silenceTimer);

        // Report what the mic hears in real time
        callbacks?.onTranscript?.(result.transcript, result.isFinal);

        if (result.isFinal && result.transcript.trim()) {
          finalTranscript = result.transcript.trim();
          stop();
          resolve(finalTranscript);
          return;
        }

        // If we're getting interim results, restart the silence timer
        silenceTimer = setTimeout(() => {
          stop();
          resolve(finalTranscript);
        }, SILENCE_TIMEOUT_MS);
      },
      // STT error during conversation turn
      (sttError) => {
        console.error("[Conversation] STT error during turn:", sttError);
        callbacks?.onDiagnostic?.("STT: " + sttError);
      },
    );

    // Overall timeout: 30s max per turn
    setTimeout(() => {
      stop();
      resolve(finalTranscript);
    }, 30_000);
  });
}

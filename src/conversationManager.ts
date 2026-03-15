/**
 * Conversation Manager for Inner World Model.
 *
 * Turn-taking flow:
 *   1. Continuously listen for wake word "Hello World Model"
 *   2. Once detected → greet user, ask an emotion-probing question
 *   3. HUD shows "Your turn" + green dot → user speaks
 *   4. Silence timeout ends the user's turn → send to Brain API
 *   5. If dominant state score >= CONFIDENCE_THRESHOLD → switch splat scene
 *   6. Model speaks reflection + next question (blue dot)
 *   7. Repeat 3-6 for several turns, or until user says goodbye
 *
 * Opening questions are designed to surface specific emotions.
 * Each has an emotion target and example user responses listed below.
 */

import { infer, type BrainInferResponse } from "./brainClient.js";
import { startListening, checkSttSupport, requestMicPermission } from "./voiceStt.js";
import { speak } from "./voiceTts.js";
import { switchSplatTo, type SplatStateName } from "./splatSwitcher.js";

const CONFIDENCE_THRESHOLD = 0.55;
const WAKE_PHRASE = "hello world model";

/**
 * Questions asked in fixed order: Defensiveness → Curiosity → Stress → Reflection.
 * Scene starts in neutral (default). Each question targets a specific emotion.
 *
 * Example user responses that would trigger each emotion:
 *
 * DEFENSIVENESS:
 *   "That wasn't my fault at all. They should have communicated better.
 *    I did everything I was supposed to do."
 *   "People always blame me but they don't see the full picture.
 *    I had good reasons for what I did."
 *
 * CURIOSITY:
 *   "I've been really fascinated by how the brain processes dreams.
 *    I keep wondering what it would be like to control them."
 *   "I saw something about deep ocean creatures — it's wild how little we know.
 *    I want to learn more about bioluminescence."
 *
 * STRESS:
 *   "I have so many deadlines this week and I can't keep up.
 *    I feel like I'm drowning in tasks and nothing gets finished."
 *   "My boss keeps adding more work and I can barely breathe.
 *    I haven't slept well in days."
 *
 * REFLECTION:
 *   "I think I've changed a lot in the last year. I used to avoid conflict
 *    but now I try to address things directly. It's been healthier."
 *   "Honestly, I realize I was wrong about how I handled that situation.
 *    I wish I had been more patient."
 */
const QUESTION_SEQUENCE: Array<{ question: string; target: string }> = [
  {
    target: "defensiveness",
    question: "Tell me about a time someone criticized you or questioned your choices. How did you respond to them?",
  },
  {
    target: "curiosity",
    question: "What is something you've been wondering about lately — something that makes you want to dig deeper and learn more?",
  },
  {
    target: "stress",
    question: "Describe what a really overwhelming day looks like for you. What does it feel like when everything piles up?",
  },
  {
    target: "reflection",
    question: "Think about a belief or opinion you held a year ago that has changed. What shifted your perspective?",
  },
];

export interface ConversationCallbacks {
  onReady?: () => void;
  onWakeWordDetected?: () => void;
  /** Fired when the model starts speaking. `text` is the exact words being spoken. */
  onModelSpeaking?: (text: string) => void;
  /** Fired when it's the user's turn — mic is open, waiting for response. */
  onListening?: () => void;
  onProcessing?: () => void;
  /** Called with interim/final transcript of what the mic hears. */
  onTranscript?: (text: string, isFinal: boolean) => void;
  onSceneChange?: (state: SplatStateName, confidence: number) => void;
  onTurnComplete?: (turn: number) => void;
  onConversationEnd?: () => void;
  onError?: (error: Error) => void;
  onDiagnostic?: (message: string) => void;
}

export function startVoiceConversation(callbacks?: ConversationCallbacks): () => void {
  let stopped = false;
  let stopCurrentListener: (() => void) | null = null;

  (async () => {
    const support = checkSttSupport();
    if (!support.supported) {
      console.error("[Conversation] STT not supported:", support.reason);
      callbacks?.onDiagnostic?.(support.reason);
      callbacks?.onError?.(new Error(support.reason));
      return;
    }

    callbacks?.onDiagnostic?.("Requesting mic permission...");
    const mic = await requestMicPermission();
    if (!mic.granted) {
      console.error("[Conversation] Mic denied:", mic.reason);
      callbacks?.onDiagnostic?.(mic.reason);
      callbacks?.onError?.(new Error(mic.reason));
      return;
    }

    if (stopped) return;

    callbacks?.onReady?.();
    callbacks?.onDiagnostic?.("");
    beginWakeWordListening();
  })().catch((err) => {
    console.error("[Conversation] Startup error:", err);
    callbacks?.onError?.(err instanceof Error ? err : new Error(String(err)));
    callbacks?.onDiagnostic?.("Startup error: " + String(err));
  });

  function beginWakeWordListening(): void {
    if (stopped) return;
    console.log("[Conversation] Listening for wake word: \"Hello World Model\"");

    // Guard: once wake word fires, ignore all further results from this listener
    let wakeTriggered = false;

    stopCurrentListener = startListening(
      (result) => {
        if (stopped || wakeTriggered) return;
        const text = result.transcript.toLowerCase();
        callbacks?.onTranscript?.(result.transcript, result.isFinal);

        if (text.includes(WAKE_PHRASE)) {
          // Set guard FIRST to block any duplicate interim/final results
          wakeTriggered = true;
          console.log("[Conversation] Wake word detected!");
          callbacks?.onWakeWordDetected?.();

          // Stop the wake-word listener before entering the conversation
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

/**
 * Helper: speak text and notify HUD with the exact words.
 * Cancels any in-progress speech first to avoid overlapping audio.
 */
async function sayAndNotify(text: string, callbacks?: ConversationCallbacks): Promise<void> {
  // Cancel any lingering speech from a previous call
  if (window.speechSynthesis) {
    window.speechSynthesis.cancel();
  }
  callbacks?.onModelSpeaking?.(text);
  await speak(text);
}

async function runConversationLoop(callbacks?: ConversationCallbacks): Promise<void> {
  // Greeting
  await sayAndNotify("Hello. I'm your world model. Let's explore something together.", callbacks);

  // Walk through the fixed question sequence:
  // Defensiveness → Curiosity → Stress → Reflection
  for (let i = 0; i < QUESTION_SEQUENCE.length; i++) {
    const { question, target } = QUESTION_SEQUENCE[i];
    console.log("[Conversation] Turn " + (i + 1) + "/" + QUESTION_SEQUENCE.length + " — target: " + target);

    // === MODEL ASKS QUESTION ===
    await sayAndNotify(question, callbacks);

    // === USER'S TURN ===
    callbacks?.onListening?.();
    callbacks?.onTranscript?.("", false);
    const transcript = await listenForResponse(callbacks);

    if (!transcript.trim()) {
      console.log("[Conversation] Empty response, ending conversation.");
      break;
    }

    const lower = transcript.toLowerCase();
    if (lower.includes("goodbye") || lower.includes("bye") || lower.includes("end session")) {
      await sayAndNotify("Thank you for sharing. Take care.", callbacks);
      break;
    }

    // === PROCESSING ===
    callbacks?.onProcessing?.();
    console.log("[Conversation] Processing: \"" + transcript.substring(0, 80) + "...\"");

    let result: BrainInferResponse;
    try {
      result = await infer(transcript);
    } catch (e) {
      console.error("[Conversation] Brain API error:", e);
      callbacks?.onError?.(e instanceof Error ? e : new Error(String(e)));
      await sayAndNotify("I had trouble processing that. Let's move on.", callbacks);
      continue;
    }

    console.log("[Conversation] Brain result: " + result.dominant_state +
      " (reflection=" + result.states.reflection.toFixed(2) +
      " defensiveness=" + result.states.defensiveness.toFixed(2) +
      " curiosity=" + result.states.curiosity.toFixed(2) +
      " stress=" + result.states.stress.toFixed(2) + ")");

    // === SCENE CHANGE ===
    const dominantScore = result.states[result.dominant_state as keyof typeof result.states];
    if (dominantScore >= CONFIDENCE_THRESHOLD) {
      const newState = result.dominant_state as SplatStateName;
      console.log("[Conversation] Scene change -> " + newState + " (score=" + dominantScore.toFixed(2) + ")");
      switchSplatTo(newState);
      callbacks?.onSceneChange?.(newState, dominantScore);
    } else {
      console.log("[Conversation] Score " + dominantScore.toFixed(2) +
        " below threshold " + CONFIDENCE_THRESHOLD + ", keeping current scene.");
    }

    // === MODEL REFLECTS ===
    if (result.voice_reflection) {
      await sayAndNotify(result.voice_reflection, callbacks);
    }

    callbacks?.onTurnComplete?.(i + 1);
  }

  // Done — return to neutral scene
  await sayAndNotify("Thank you for sharing. Your world is returning to its resting state.", callbacks);
  switchSplatTo("neutral");
  callbacks?.onConversationEnd?.();
}

function listenForResponse(callbacks?: ConversationCallbacks): Promise<string> {
  return new Promise((resolve) => {
    let finalTranscript = "";
    let silenceTimer: ReturnType<typeof setTimeout> | null = null;
    let resolved = false;
    const SILENCE_TIMEOUT_MS = 10_000;

    const stop = startListening(
      (result) => {
        if (resolved) return;
        if (silenceTimer) clearTimeout(silenceTimer);

        callbacks?.onTranscript?.(result.transcript, result.isFinal);

        if (result.isFinal && result.transcript.trim()) {
          finalTranscript = result.transcript.trim();
          resolved = true;
          stop();
          resolve(finalTranscript);
          return;
        }

        silenceTimer = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            stop();
            resolve(finalTranscript);
          }
        }, SILENCE_TIMEOUT_MS);
      },
      (sttError) => {
        console.error("[Conversation] STT error during turn:", sttError);
        callbacks?.onDiagnostic?.("STT: " + sttError);
      },
    );

    // Hard timeout per turn
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        stop();
        resolve(finalTranscript);
      }
    }, 30_000);
  });
}

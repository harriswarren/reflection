/**
 * Conversation manager for Inner World Model.
 * Orchestrates the loop:
 *   1. Play initial question (or show it)
 *   2. Start STT (user speaks)
 *   3. On final transcript → POST /infer (Brain)
 *   4. onStateUpdate(result) → app updates CognitiveState entity → world reacts
 *   5. TTS(voice_reflection) then TTS(next_question)
 *   6. Repeat 2–5 for 2–3 turns, then end.
 *
 * Wire this into your World after world.create(): pass initialQuestion and
 * onStateUpdate (where you update the entity that has CognitiveState).
 */

import { infer, type BrainInferResponse } from "./brainClient.js";
import { startListening } from "./voiceStt.js";
import { speak } from "./voiceTts.js";

const MAX_TURNS = 3;

export interface ConversationCallbacks {
  onListening?: () => void;
  onThinking?: () => void;
  onSpeaking?: () => void;
  onTurnComplete?: (turn: number) => void;
  /** Called with Brain response so the app can update CognitiveState entity and drive the world. */
  onStateUpdate: (result: BrainInferResponse) => void;
}

/**
 * Runs the full conversation flow: listen → Brain → onStateUpdate → TTS.
 * Implement onStateUpdate to set your CognitiveState component from result
 * (dominant_state, states.reflection, etc.) so CognitiveWorldSystem can react.
 */
export async function runConversation(
  initialQuestion: string,
  callbacks: ConversationCallbacks
): Promise<void> {
  await speak(initialQuestion);
  let turn = 0;

  while (turn < MAX_TURNS) {
    callbacks.onListening?.();
    const transcript = await listenForFinalTranscript();
    if (!transcript.trim()) {
      continue;
    }

    callbacks.onThinking?.();
    let result: BrainInferResponse;
    try {
      result = await infer(transcript);
    } catch (e) {
      console.error("[ConversationManager] Brain API error:", e);
      break;
    }

    callbacks.onStateUpdate(result);

    callbacks.onSpeaking?.();
    await speak(result.voice_reflection);
    await speak(result.next_question);

    turn++;
    callbacks.onTurnComplete?.(turn);
  }
}

/** Returns a Promise that resolves with the final transcript when the user stops speaking (isFinal). */
function listenForFinalTranscript(): Promise<string> {
  return new Promise((resolve) => {
    let finalTranscript = "";
    const stop = startListening((result) => {
      if (result.isFinal && result.transcript.trim()) {
        finalTranscript = result.transcript.trim();
        stop();
        resolve(finalTranscript);
      }
    });
    // Optional: timeout after 30s and resolve with whatever we have
    setTimeout(() => {
      stop();
      resolve(finalTranscript);
    }, 30_000);
  });
}

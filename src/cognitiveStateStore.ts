/**
 * Shared cognitive state driven by voice → Brain API.
 * Conversation manager writes here on each Brain response; CognitiveWorldSystem
 * reads here each frame and drives bridge / fog / island / light.
 * This is the "signal" that changes the world model from voice input.
 */

import type { BrainInferResponse } from "./brainClient.js";

export type DominantState = "reflection" | "defensiveness" | "curiosity" | "stress";

export interface CognitiveStateSnapshot {
  dominantState: DominantState;
  reflection: number;
  defensiveness: number;
  curiosity: number;
  stress: number;
}

const defaultState: CognitiveStateSnapshot = {
  dominantState: "reflection",
  reflection: 0.5,
  defensiveness: 0,
  curiosity: 0,
  stress: 0,
};

/** Current state. Read by CognitiveWorldSystem; written by onStateUpdate (voice → Brain response). */
let current: CognitiveStateSnapshot = { ...defaultState };

/** Update state from a Brain API response (call this from conversationManager's onStateUpdate). */
export function setCognitiveState(result: BrainInferResponse): void {
  current = {
    dominantState: result.dominant_state as DominantState,
    reflection: result.states.reflection,
    defensiveness: result.states.defensiveness,
    curiosity: result.states.curiosity,
    stress: result.states.stress,
  };
}

/** Read current state (used by CognitiveWorldSystem each frame). */
export function getCognitiveState(): CognitiveStateSnapshot {
  return current;
}

/** Reset to default (e.g. at session start). */
export function resetCognitiveState(): void {
  current = { ...defaultState };
}

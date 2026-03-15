/**
 * Environment (splat) state for controller-driven switching.
 * "Neutral" = Venice.spz; other states use Venice-{State}.spz and also
 * update the cognitive state store so bridge/fog/light react.
 */

import type { DominantState } from "./cognitiveStateStore.js";
import { setCognitiveStateFromDominant, resetCognitiveState } from "./cognitiveStateStore.js";

export type SplatState = "neutral" | DominantState;

let current: SplatState = "neutral";

export function getSplatState(): SplatState {
  return current;
}

/** Set environment state. Non-neutral also updates cognitive state for bridge/fog/light. */
export function setSplatState(state: SplatState): void {
  current = state;
  if (state === "neutral") {
    resetCognitiveState();
  } else {
    setCognitiveStateFromDominant(state);
  }
}

/** Toggle a state: if current is that state, go to neutral; otherwise set to that state. */
export function toggleSplatState(state: DominantState): void {
  if (current === state) {
    setSplatState("neutral");
  } else {
    setSplatState(state);
  }
}

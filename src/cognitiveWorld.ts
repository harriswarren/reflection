/**
 * Cognitive World — state-driven environment for Inner World Model.
 * Mapping from dominant_state to world changes (see docs/STATE_ENVIRONMENT_MAPPING.md):
 *   reflection    → bridge opens / world expands / light softens
 *   defensiveness → bridge retracts / walls rise / space narrows
 *   curiosity     → distant island lights up / hidden path / particles
 *   stress        → fog increases / light dims / ambient deepens
 *
 * Add this component to a "world state" entity; CognitiveWorldSystem will
 * create/update bridge, wall, island, fog, and lights based on dominant_state.
 * State scores (0–1) control transition strength for smoother animation.
 */

import { Types, createComponent, createSystem } from "@iwsdk/core";

export type DominantState = "reflection" | "defensiveness" | "curiosity" | "stress";

/** Component holding the current cognitive state from the Brain API. */
export const CognitiveState = createComponent("CognitiveState", {
  dominantState: { type: Types.String, default: "reflection" as DominantState },
  /** Optional raw scores 0..1 for smooth transitions. */
  reflection: { type: Types.Float32, default: 0 },
  defensiveness: { type: Types.Float32, default: 0 },
  curiosity: { type: Types.Float32, default: 0 },
  stress: { type: Types.Float32, default: 0 },
});

/**
 * System that applies CognitiveState to the scene: bridge positions, wall height,
 * fog density, distant island glow. Create bridge/wall/island/fog objects in
 * your world and reference them here, or create them in init().
 */
export class CognitiveWorldSystem extends createSystem({
  state: { required: [CognitiveState] },
}) {
  // TODO: in init(), create or get references to:
  //   - 2–3 bridge Object3Ds (scale/position for "open" vs "retract")
  //   - 1 wall Object3D (position.y or scale for "rises")
  //   - 1 distant island Object3D or light (emissive/visibility for "lights up")
  //   - world.scene.fog (FogExp2 density/color for stress)
  // In execute(), read state.dominantState and state.stress etc., then
  // lerp bridge/wall/island/fog to target values over ~1–2s.
  execute() {
    // Placeholder: no-op until scene entities are added in index.ts and wired here.
  }
}

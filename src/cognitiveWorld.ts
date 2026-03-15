/**
 * Cognitive World — state-driven environment for Inner World Model.
 * Mapping from dominant_state to world changes (see docs/STATE_ENVIRONMENT_MAPPING.md):
 *   reflection    → bridge opens / world expands / light softens
 *   defensiveness → bridge retracts / walls rise / space narrows
 *   curiosity     → distant island lights up / hidden path / particles
 *   stress        → fog increases / light dims / ambient deepens
 *
 * Reads state from cognitiveStateStore (updated by voice → Brain → onStateUpdate)
 * and drives bridge, wall, island, fog, and light with smooth lerp.
 */

import * as THREE from "three";
import { Types, createComponent, createSystem } from "@iwsdk/core";
import { getCognitiveState } from "./cognitiveStateStore.js";
import { getSplatState } from "./environmentStore.js";
import { GaussianSplatLoader, GaussianSplatLoaderSystem } from "./gaussianSplatLoader.js";
import { SPLAT_URL_NEUTRAL, SPLAT_URL_BY_STATE } from "./config.js";

const LERP = 0.03; // Smooth transition per frame
const FOG_MAX = 0.08;
const FOG_MIN = 0.001;

/** Component for the state entity (system runs when this entity exists). Actual state is in cognitiveStateStore. */
export type DominantState = "reflection" | "defensiveness" | "curiosity" | "stress";
export const CognitiveState = createComponent("CognitiveState", {
  dominantState: { type: Types.String, default: "reflection" as DominantState },
  reflection: { type: Types.Float32, default: 0 },
  defensiveness: { type: Types.Float32, default: 0 },
  curiosity: { type: Types.Float32, default: 0 },
  stress: { type: Types.Float32, default: 0 },
});

/** Scene objects we drive from cognitive state (island removed per design). */
interface CognitiveScene {
  bridge: THREE.Mesh;
  wall: THREE.Mesh;
  ambientLight: THREE.AmbientLight;
  fog: THREE.FogExp2;
}

/** System that applies cognitive state (from store) to the scene and switches splat by dominant state. */
export class CognitiveWorldSystem extends createSystem({
  state: { required: [CognitiveState] },
  splats: { required: [GaussianSplatLoader] },
}) {
  private scene: CognitiveScene | null = null;
  private bridgeTargetScale = 1;
  private wallTargetY = 0;
  private fogDensityTarget = FOG_MIN;
  private lightIntensityTarget = 1;
  /** Track splat state so we only switch environment when it changes (controller or UI). */
  private lastSplatState: string | null = null;

  init(): void {
    const scene = this.world.scene;
    const { camera } = this.world;

    // Bridge: thin box in front of camera; "open" = scale.z 1, "retract" = scale.z 0.2
    const bridgeGeom = new THREE.BoxGeometry(3, 0.3, 2);
    const bridgeMat = new THREE.MeshBasicMaterial({ color: 0x8b7355 });
    const bridge = new THREE.Mesh(bridgeGeom, bridgeMat);
    bridge.position.set(0, 0.5, -5);
    bridge.scale.set(1, 1, 0.3);
    scene.add(bridge);

    // Wall: plane that "rises" (defensiveness) — move up from below floor
    const wallGeom = new THREE.PlaneGeometry(20, 6);
    const wallMat = new THREE.MeshBasicMaterial({
      color: 0x4a4a4a,
      side: THREE.DoubleSide,
    });
    const wall = new THREE.Mesh(wallGeom, wallMat);
    wall.position.set(0, -4, -8);
    wall.rotation.y = Math.PI;
    scene.add(wall);

    // Fog (stress)
    const fog = new THREE.FogExp2(0x223344, FOG_MIN);
    scene.fog = fog;

    // Ambient light (stress dims it)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    this.scene = {
      bridge,
      wall,
      ambientLight,
      fog,
    };
  }

  execute(): void {
    if (!this.scene) return;

    // Splat switching is driven by environment store (controller A/B/X/Y or UI buttons)
    const splatState = getSplatState();
    if (splatState !== this.lastSplatState) {
      const previous = this.lastSplatState;
      this.lastSplatState = splatState;
      // First frame: only sync state; initial splat already loaded (Venice.spz) in index.ts
      if (previous !== null) {
        const splatUrl = splatState === "neutral" ? SPLAT_URL_NEUTRAL : SPLAT_URL_BY_STATE[splatState];
        if (splatUrl && this.queries.splats.entities.length > 0) {
          const splatEntity = this.queries.splats.entities[0];
          const loaderSystem = this.world.getSystem(GaussianSplatLoaderSystem);
          if (loaderSystem) {
            (loaderSystem as GaussianSplatLoaderSystem)
              .load(splatEntity, { splatUrl, animate: true })
              .catch((err) => console.error("[CognitiveWorld] Splat switch failed:", err));
          }
        }
      }
    }

    const state = getCognitiveState();
    const { dominantState, reflection, defensiveness, curiosity, stress } = state;

    // Map dominant state + scores to targets (see STATE_ENVIRONMENT_MAPPING.md)
    switch (dominantState) {
      case "reflection":
        this.bridgeTargetScale = 0.3 + 0.7 * reflection;
        this.wallTargetY = -4;
        this.fogDensityTarget = FOG_MIN;
        this.lightIntensityTarget = 0.7 + 0.3 * reflection;
        break;
      case "defensiveness":
        this.bridgeTargetScale = Math.max(0.15, 0.5 - 0.35 * defensiveness);
        this.wallTargetY = -4 + 5 * defensiveness;
        this.fogDensityTarget = FOG_MIN + 0.02 * defensiveness;
        this.lightIntensityTarget = 1 - 0.3 * defensiveness;
        break;
      case "curiosity":
        this.bridgeTargetScale = 0.5;
        this.wallTargetY = -4;
        this.fogDensityTarget = FOG_MIN;
        this.lightIntensityTarget = 1;
        break;
      case "stress":
        this.bridgeTargetScale = 0.4;
        this.wallTargetY = -4;
        this.fogDensityTarget = FOG_MIN + (FOG_MAX - FOG_MIN) * stress;
        this.lightIntensityTarget = Math.max(0.4, 1 - 0.6 * stress);
        break;
      default:
        break;
    }

    const { bridge, wall, ambientLight, fog } = this.scene;

    bridge.scale.z += (this.bridgeTargetScale - bridge.scale.z) * LERP;
    wall.position.y += (this.wallTargetY - wall.position.y) * LERP;
    fog.density += (this.fogDensityTarget - fog.density) * LERP;
    ambientLight.intensity += (this.lightIntensityTarget - ambientLight.intensity) * LERP;
  }
}

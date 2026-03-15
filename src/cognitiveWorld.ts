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

/** Scene objects we drive from cognitive state. */
interface CognitiveScene {
  bridge: THREE.Mesh;
  wall: THREE.Mesh;
  island: THREE.Mesh;
  islandLight: THREE.PointLight;
  ambientLight: THREE.AmbientLight;
  fog: THREE.FogExp2;
}

/** System that applies cognitive state (from store) to the scene. */
export class CognitiveWorldSystem extends createSystem({
  state: { required: [CognitiveState] },
}) {
  private scene: CognitiveScene | null = null;
  private bridgeTargetScale = 1;
  private wallTargetY = 0;
  private islandEmissiveTarget = 0;
  private fogDensityTarget = FOG_MIN;
  private lightIntensityTarget = 1;

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

    // Distant island: sphere that "lights up" (curiosity)
    const islandGeom = new THREE.SphereGeometry(2, 16, 16);
    const islandMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      emissive: 0x224422,
      emissiveIntensity: 0,
    });
    const island = new THREE.Mesh(islandGeom, islandMat);
    island.position.set(8, 1, -15);
    scene.add(island);

    const islandLight = new THREE.PointLight(0x88ff88, 0, 20);
    islandLight.position.copy(island.position);
    scene.add(islandLight);

    // Fog (stress)
    const fog = new THREE.FogExp2(0x223344, FOG_MIN);
    scene.fog = fog;

    // Ambient light (stress dims it)
    const ambientLight = new THREE.AmbientLight(0xffffff, 1);
    scene.add(ambientLight);

    this.scene = {
      bridge,
      wall,
      island,
      islandLight,
      ambientLight,
      fog,
    };
  }

  execute(): void {
    if (!this.scene) return;

    const state = getCognitiveState();
    const { dominantState, reflection, defensiveness, curiosity, stress } = state;

    // Map dominant state + scores to targets (see STATE_ENVIRONMENT_MAPPING.md)
    switch (dominantState) {
      case "reflection":
        this.bridgeTargetScale = 0.3 + 0.7 * reflection;
        this.wallTargetY = -4;
        this.islandEmissiveTarget = 0;
        this.fogDensityTarget = FOG_MIN;
        this.lightIntensityTarget = 0.7 + 0.3 * reflection;
        break;
      case "defensiveness":
        this.bridgeTargetScale = Math.max(0.15, 0.5 - 0.35 * defensiveness);
        this.wallTargetY = -4 + 5 * defensiveness;
        this.islandEmissiveTarget = 0;
        this.fogDensityTarget = FOG_MIN + 0.02 * defensiveness;
        this.lightIntensityTarget = 1 - 0.3 * defensiveness;
        break;
      case "curiosity":
        this.bridgeTargetScale = 0.5;
        this.wallTargetY = -4;
        this.islandEmissiveTarget = 0.3 + 0.6 * curiosity;
        this.fogDensityTarget = FOG_MIN;
        this.lightIntensityTarget = 1;
        break;
      case "stress":
        this.bridgeTargetScale = 0.4;
        this.wallTargetY = -4;
        this.islandEmissiveTarget = 0;
        this.fogDensityTarget = FOG_MIN + (FOG_MAX - FOG_MIN) * stress;
        this.lightIntensityTarget = Math.max(0.4, 1 - 0.6 * stress);
        break;
      default:
        break;
    }

    const { bridge, wall, island, islandLight, ambientLight, fog } = this.scene;

    // Lerp current values toward targets
    bridge.scale.z += (this.bridgeTargetScale - bridge.scale.z) * LERP;
    wall.position.y += (this.wallTargetY - wall.position.y) * LERP;

    const islandMat = island.material as THREE.MeshStandardMaterial;
    const currentEmissive = islandMat.emissiveIntensity ?? 0;
    islandMat.emissiveIntensity = currentEmissive + (this.islandEmissiveTarget - currentEmissive) * LERP;
    islandLight.intensity = islandMat.emissiveIntensity * 2;

    fog.density += (this.fogDensityTarget - fog.density) * LERP;
    ambientLight.intensity += (this.lightIntensityTarget - ambientLight.intensity) * LERP;
  }
}

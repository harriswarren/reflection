/**
 * SplatSwitcher — preloads ALL state splats at startup and switches
 * between them by toggling .visible (synchronous, instant).
 *
 * Why: loading/unloading splats on button press is async and unreliable.
 * By keeping all splats resident in the scene, switching is a single
 * boolean flip — guaranteed to take effect on the next render frame.
 *
 * Usage:
 *   await initSplatSwitcher(world);   // once at startup
 *   toggleSplatByState("reflection"); // on button press
 */

import * as THREE from "three";
import { SparkRenderer, SplatMesh } from "@sparkjsdev/spark";
import { SPLAT_URL_NEUTRAL, SPLAT_URL_BY_STATE } from "./config.js";

export type SplatStateName = "neutral" | "reflection" | "defensiveness" | "curiosity" | "stress";

// All splat URLs keyed by state name
const ALL_SPLAT_URLS: Record<SplatStateName, string> = {
  neutral: SPLAT_URL_NEUTRAL,
  reflection: SPLAT_URL_BY_STATE.reflection,
  defensiveness: SPLAT_URL_BY_STATE.defensiveness,
  curiosity: SPLAT_URL_BY_STATE.curiosity,
  stress: SPLAT_URL_BY_STATE.stress,
};

// Module state
let splats: Map<SplatStateName, SplatMesh> = new Map();
let currentState: SplatStateName = "neutral";
let ready = false;

export function isReady(): boolean {
  return ready;
}

export function getCurrentSplatState(): SplatStateName {
  return currentState;
}

/**
 * Load all 5 splats and add them to the scene. Only the neutral
 * splat is visible initially. Call once after World.create().
 */
export async function initSplatSwitcher(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  camera: THREE.Camera,
): Promise<void> {
  // SparkRenderer — required for Gaussian splat rendering
  const spark = new SparkRenderer({
    renderer: renderer,
    enableLod: true,
    lodSplatScale: 1.0,
    behindFoveate: 0.1,
  });
  spark.outsideFoveate = 0.3;
  spark.renderOrder = -10;
  scene.add(spark);

  // SparkJS driveLod() deep-clones the camera; IWSDK camera has UIKit
  // children that crash on clone, so we provide a safe shallow clone.
  const cam = camera as THREE.PerspectiveCamera;
  cam.clone = function () {
    const c = new THREE.PerspectiveCamera();
    c.projectionMatrix.copy(this.projectionMatrix);
    c.projectionMatrixInverse.copy(this.projectionMatrixInverse);
    c.matrixWorld.copy(this.matrixWorld);
    c.matrixWorldInverse.copy(this.matrixWorldInverse);
    return c;
  };

  // Load all splats in parallel
  const entries = Object.entries(ALL_SPLAT_URLS) as [SplatStateName, string][];
  const loadPromises = entries.map(async ([state, url]) => {
    console.log("[SplatSwitcher] Loading " + state + ": " + url);
    const splatMesh = new SplatMesh({ url, lod: true });
    await splatMesh.initialized;
    splatMesh.renderOrder = -10;
    // Only neutral visible at startup
    splatMesh.visible = (state === "neutral");
    scene.add(splatMesh);
    splats.set(state, splatMesh);
    console.log("[SplatSwitcher] Loaded " + state);
  });

  await Promise.all(loadPromises);
  ready = true;
  console.log("[SplatSwitcher] All " + splats.size + " splats loaded and ready.");
}

/**
 * Switch to the given state: hide all splats, show the target.
 * This is synchronous — takes effect on the very next render.
 */
export function switchSplatTo(state: SplatStateName): void {
  if (!ready) {
    console.warn("[SplatSwitcher] Not ready yet, ignoring switch to " + state);
    return;
  }
  for (const [key, mesh] of splats) {
    mesh.visible = (key === state);
  }
  currentState = state;
  console.log("[SplatSwitcher] Switched to: " + state);
}

/**
 * Toggle: if currently showing this state, go to neutral; else switch to it.
 * This is what buttons should call.
 */
export function toggleSplatByState(state: SplatStateName): void {
  if (currentState === state) {
    switchSplatTo("neutral");
  } else {
    switchSplatTo(state);
  }
}

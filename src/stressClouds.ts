/**
 * StressClouds — loads stormy-cloud.glb and scatters multiple instances
 * across the sky. Clouds are only visible when the "stress" cognitive
 * state is active. Each clone gets a random position, rotation, and
 * slight scale variation for a natural feel.
 */

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const CLOUD_URL = "./gltf/stormy-cloud.glb";

// How many cloud copies to scatter around the scene
const CLOUD_COUNT = 7;

// Height range for clouds (meters above ground)
const MIN_HEIGHT = 8;
const MAX_HEIGHT = 14;

// Horizontal spread — how far from the origin clouds can appear
const SPREAD = 25;

// Scale range (multiplier on the original model size)
const MIN_SCALE = 1.5;
const MAX_SCALE = 3.5;

let cloudGroup: THREE.Group | null = null;
let loaded = false;

/**
 * Load the cloud GLB and create CLOUD_COUNT clones scattered in the sky.
 * All clouds start hidden. Call showClouds()/hideClouds() to toggle.
 */
export async function initStressClouds(scene: THREE.Scene): Promise<void> {
  const loader = new GLTFLoader();

  let gltf: { scene: THREE.Object3D };
  try {
    gltf = await loader.loadAsync(CLOUD_URL) as { scene: THREE.Object3D };
  } catch (err) {
    console.error("[StressClouds] Failed to load " + CLOUD_URL, err);
    return;
  }

  const template = gltf.scene;
  cloudGroup = new THREE.Group();
  cloudGroup.name = "stress-clouds";
  cloudGroup.visible = false;

  for (let i = 0; i < CLOUD_COUNT; i++) {
    const cloud = template.clone();

    // Random position in a ring around the user, at cloud altitude
    const x = (Math.random() - 0.5) * SPREAD * 2;
    const z = (Math.random() - 0.5) * SPREAD * 2;
    const y = MIN_HEIGHT + Math.random() * (MAX_HEIGHT - MIN_HEIGHT);
    cloud.position.set(x, y, z);

    // Random Y rotation so they don't all face the same way
    cloud.rotation.y = Math.random() * Math.PI * 2;

    // Slight random scale variation
    const s = MIN_SCALE + Math.random() * (MAX_SCALE - MIN_SCALE);
    cloud.scale.set(s, s, s);

    cloudGroup.add(cloud);
  }

  scene.add(cloudGroup);
  loaded = true;
  console.log("[StressClouds] " + CLOUD_COUNT + " clouds placed, hidden until stress state.");
}

export function showClouds(): void {
  if (cloudGroup) cloudGroup.visible = true;
}

export function hideClouds(): void {
  if (cloudGroup) cloudGroup.visible = false;
}

export function areCloudsLoaded(): boolean {
  return loaded;
}

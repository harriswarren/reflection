import * as THREE from "three";
import {
  EnvironmentType,
  Interactable,
  LocomotionEnvironment,
  Mesh,
  MeshBasicMaterial,
  PanelUI,
  PlaneGeometry,
  ScreenSpace,
  SessionMode,
  VisibilityState,
  World,
} from "@iwsdk/core";
import { PanelSystem } from "./uiPanel.js";
import { initSplatSwitcher, toggleSplatByState } from "./splatSwitcher.js";
import { startVoiceConversation } from "./conversationManager.js";


// ------------------------------------------------------------
// World (IWSDK settings)
// ------------------------------------------------------------
World.create(document.getElementById("scene-container") as HTMLDivElement, {
  assets: {},
  xr: {
    sessionMode: SessionMode.ImmersiveVR,
    offer: "always",
    features: { handTracking: true, layers: true },
  },
  render: {
    defaultLighting: false,
  },
  features: {
    locomotion: true,
    grabbing: true,
    physics: false,
    sceneUnderstanding: false,
  },
})
  .then(async (world) => {
    world.camera.position.set(0, 1.5, 0);
    world.scene.background = new THREE.Color(0x000000);
    world.scene.add(new THREE.AmbientLight(0xffffff, 1.0));

    world.registerSystem(PanelSystem);

    // Load all 5 splats (neutral + 4 states). All resident in memory;
    // switching is instant via .visible toggle.
    await initSplatSwitcher(world.scene, world.renderer, world.camera);

    // ------------------------------------------------------------
    // Invisible floor for locomotion
    // ------------------------------------------------------------
    const floorGeometry = new PlaneGeometry(100, 100);
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new Mesh(floorGeometry, new MeshBasicMaterial());
    floor.visible = false;
    world
      .createTransformEntity(floor)
      .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

    const grid = new THREE.GridHelper(100, 100, 0x444444, 0x222222);
    grid.material.transparent = true;
    grid.material.opacity = 0.4;
    world.scene.add(grid);

    // ------------------------------------------------------------
    // Panel UI (centered on screen in desktop, positioned in 3D for XR)
    // ------------------------------------------------------------
    const panelEntity = world
      .createTransformEntity()
      .addComponent(PanelUI, {
        config: "./ui/sensai.json",
        maxHeight: 0.8,
        maxWidth: 1.6,
      })
      .addComponent(Interactable)
      .addComponent(ScreenSpace, {
        top: "30%",
        bottom: "30%",
        left: "30%",
        right: "30%",
        height: "40%",
        width: "40%",
      });
    panelEntity.object3D!.position.set(0, 1.29, -1.9);

    // Desktop HTML buttons also toggle splats
    const stateButtons = document.getElementById("state-buttons");
    if (stateButtons) {
      stateButtons.querySelectorAll<HTMLButtonElement>("button[data-state]").forEach((btn) => {
        const state = btn.getAttribute("data-state") as "reflection" | "defensiveness" | "curiosity" | "stress";
        if (state) btn.addEventListener("click", () => toggleSplatByState(state));
      });
    }

    // Voice conversation: wake word "Hello World Model" → listen → Brain → scene change.
    // Uses Pico 4 mic via Web Speech API. Runs continuously in background.
    startVoiceConversation({
      onWakeWordDetected: () => console.log("[World] Wake word detected, starting conversation..."),
      onListening: () => console.log("[World] Listening for user response..."),
      onProcessing: () => console.log("[World] Processing speech..."),
      onSceneChange: (state, score) => console.log("[World] Scene → " + state + " (confidence: " + score.toFixed(2) + ")"),
      onConversationEnd: () => console.log("[World] Conversation ended, back to wake word listening."),
      onError: (err) => console.error("[World] Conversation error:", err),
    });

  })
  .catch((err) => {
    console.error("[World] Failed to create the IWSDK world:", err);
  });

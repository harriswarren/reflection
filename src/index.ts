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
import { VoiceStatusHud } from "./voiceStatusHud.js";


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

    // Voice status HUD: pinned to bottom-left of view, shows mic/speaking/processing state
    const hud = new VoiceStatusHud(world.camera);

    // Voice conversation: wake word "Hello World Model" → listen → Brain → scene change.
    // Uses Pico 4 mic via Web Speech API. Runs continuously in background.
    startVoiceConversation({
      onWakeWordDetected: () => {
        hud.setState("listening");
        hud.setTranscript("");
        hud.setEmotion("");
      },
      onListening: () => {
        hud.setState("listening");
      },
      onProcessing: () => {
        hud.setState("processing");
      },
      onSpeaking: () => {
        hud.setState("speaking");
      },
      onTranscript: (text) => {
        hud.setTranscript(text);
      },
      onSceneChange: (state, score) => {
        const label = state.charAt(0).toUpperCase() + state.slice(1);
        hud.setEmotion(label + " (" + (score * 100).toFixed(0) + "%)");
      },
      onConversationEnd: () => {
        hud.setState("idle");
        hud.setTranscript("");
        hud.setEmotion("");
      },
      onError: (err) => {
        hud.setState("error");
        console.error("[World] Conversation error:", err);
      },
    });

  })
  .catch((err) => {
    console.error("[World] Failed to create the IWSDK world:", err);
  });

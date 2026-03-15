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

    // Camera must be in the scene graph for HUD sprites (children of camera) to render
    world.scene.add(world.camera);

    world.registerSystem(PanelSystem);

    // Load all 5 splats (neutral + 4 states). All resident in memory;
    // switching is instant via .visible toggle.
    await initSplatSwitcher(world.scene, world.renderer, world.camera);

    // ------------------------------------------------------------
    // Locomotion floor — two layers:
    //  1. IWSDK entity with LocomotionEnvironment (visible=false is fine;
    //     the locomotor merges geometry at init, independent of visibility).
    //  2. A native Three.js plane added to the scene as a backup raycast
    //     target, fully transparent so it's invisible to the user.
    // ------------------------------------------------------------
    const floorGeometry = new PlaneGeometry(200, 200);
    floorGeometry.rotateX(-Math.PI / 2);
    const floor = new Mesh(floorGeometry, new MeshBasicMaterial());
    floor.visible = false;
    world
      .createTransformEntity(floor)
      .addComponent(LocomotionEnvironment, { type: EnvironmentType.STATIC });

    // Native Three.js backup floor for raycast-based locomotion
    const nativeFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(200, 200),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    nativeFloor.rotation.x = -Math.PI / 2;
    nativeFloor.position.y = 0;
    world.scene.add(nativeFloor);

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
    startVoiceConversation({
      onReady: () => {
        hud.setState("wake_word");
        hud.setModelText("");
        hud.setUserText("");
      },
      onWakeWordDetected: () => {
        hud.setState("speaking");
        hud.setUserText("");
        hud.setEmotion("");
      },
      onModelSpeaking: (text) => {
        hud.setState("speaking");
        hud.setModelText(text);
      },
      onListening: () => {
        hud.setState("listening");
        hud.setUserText("");
      },
      onProcessing: () => {
        hud.setState("processing");
      },
      onTranscript: (text) => {
        hud.setUserText(text);
      },
      onSceneChange: (state, score) => {
        const label = state.charAt(0).toUpperCase() + state.slice(1);
        hud.setEmotion(label + " (" + (score * 100).toFixed(0) + "%)");
      },
      onConversationEnd: () => {
        hud.setState("wake_word");
        hud.setModelText("");
        hud.setUserText("");
        hud.setEmotion("");
      },
      onDiagnostic: (msg) => {
        hud.setUserText(msg);
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

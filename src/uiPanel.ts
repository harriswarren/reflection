import {
  createSystem,
  Entity,
  PanelUI,
  PanelDocument,
  eq,
  VisibilityState,
  UIKitDocument,
  UIKit,
} from "@iwsdk/core";
import * as THREE from "three";
import {
  toggleSplatByState,
  getCurrentSplatState,
  type SplatStateName,
} from "./splatSwitcher.js";

const STATE_BUTTONS: SplatStateName[] = ["reflection", "defensiveness", "curiosity", "stress"];

function updateStateButtonLabels(doc: UIKitDocument): void {
  const current = getCurrentSplatState();
  for (const state of STATE_BUTTONS) {
    const btn = doc.getElementById("state-" + state) as UIKit.Text | undefined;
    if (btn?.setProperties) {
      const label = state.charAt(0).toUpperCase() + state.slice(1);
      const isOn = current === state;
      btn.setProperties({ text: label + " " + (isOn ? "(ON)" : "(OFF)") });
    }
  }
}

// Render UI on top of splats using AlwaysDepth + high renderOrder.
const UI_RENDER_ORDER = 10_000;
const APPLIED_FLAG = "__uiDepthConfigApplied";

function configureUIMaterial(material: THREE.Material | null | undefined) {
  if (!material) return;
  material.depthTest = true;
  material.depthWrite = true;
  material.depthFunc = THREE.AlwaysDepth;

  if (material instanceof THREE.MeshBasicMaterial && material.map) {
    material.transparent = true;
    material.alphaTest = 0.01;
  }
}

function applyRenderOrderToObject(object3D: THREE.Object3D) {
  object3D.traverse((obj) => {
    obj.renderOrder = UI_RENDER_ORDER;

    if (obj instanceof THREE.Mesh) {
      if (obj.userData[APPLIED_FLAG]) return;
      obj.userData[APPLIED_FLAG] = true;

      if (Array.isArray(obj.material)) {
        obj.material.forEach((m) => configureUIMaterial(m));
      } else {
        configureUIMaterial(obj.material);
      }

      const originalOnBeforeRender = obj.onBeforeRender;
      obj.onBeforeRender = function (
        renderer,
        scene,
        camera,
        geometry,
        material,
        group,
      ) {
        configureUIMaterial(material as THREE.Material);
        if (typeof originalOnBeforeRender === "function") {
          originalOnBeforeRender.call(
            this,
            renderer,
            scene,
            camera,
            geometry,
            material,
            group,
          );
        }
      };
    }
  });
}

export function makeEntityRenderOnTop(entity: Entity): void {
  let attempts = 0;

  const tryApply = () => {
    if (entity.object3D) {
      applyRenderOrderToObject(entity.object3D);
      return;
    }
    if (++attempts < 10) {
      requestAnimationFrame(tryApply);
    } else {
      console.warn(
        "[Panel] makeEntityRenderOnTop: entity " + entity.index + " had no object3D after 10 frames.",
      );
    }
  };

  tryApply();
}

export class PanelSystem extends createSystem({
  sensaiPanel: {
    required: [PanelUI, PanelDocument],
    where: [eq(PanelUI, "config", "./ui/sensai.json")],
  },
}) {
  init() {
    this.queries.sensaiPanel.subscribe("qualify", (entity) => {
      makeEntityRenderOnTop(entity);

      const panelDoc = PanelDocument.data.document[
        entity.index
      ] as UIKitDocument;
      if (!panelDoc) return;

      // XR enter/exit button
      const xrButton = panelDoc.getElementById("xr-button") as UIKit.Text;
      xrButton.addEventListener("click", () => {
        if (this.world.visibilityState.value === VisibilityState.NonImmersive) {
          this.world.launchXR();
        } else {
          this.world.exitXR();
        }
      });

      this.world.visibilityState.subscribe((visibilityState) => {
        xrButton.setProperties({
          text:
            visibilityState === VisibilityState.NonImmersive
              ? "Enter XR"
              : "Exit to Browser",
        });
      });

      // Splat state buttons — directly toggle via splatSwitcher (instant)
      for (const state of STATE_BUTTONS) {
        const btn = panelDoc.getElementById("state-" + state);
        if (btn) {
          btn.addEventListener("click", () => {
            console.log("[Panel] Button clicked: " + state);
            toggleSplatByState(state);
            updateStateButtonLabels(panelDoc);
          });
        } else {
          console.warn("[Panel] Button not found: state-" + state);
        }
      }
      updateStateButtonLabels(panelDoc);
    }, true);
  }
}

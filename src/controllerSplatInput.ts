/**
 * WebXR controller input for Pico 4 (and other xr-standard mapping devices).
 * Polls session.inputSources each frame and maps face buttons to splat state:
 *   A (right, button 4) = toggle reflection <-> neutral
 *   B (right, button 5) = toggle defensiveness <-> neutral
 *   X (left,  button 4) = toggle curiosity <-> neutral
 *   Y (left,  button 5) = toggle stress <-> neutral
 *
 * WebXR Gamepads Module uses "xr-standard" mapping; Pico 4 is exposed via the same API.
 */

import { createSystem } from "@iwsdk/core";
import type * as THREE from "three";
import { toggleSplatState } from "./environmentStore.js";

// xr-standard mapping: 0=trigger, 1=grip, 2=touchpad, 3=thumbstick, 4=primary face (A/X), 5=secondary face (B/Y)
const BUTTON_PRIMARY = 4;
const BUTTON_SECONDARY = 5;

/** Tracks previous frame button state for edge detection (only fire on "just pressed"). */
const prevPressed: Record<string, { primary: boolean; secondary: boolean }> = {};

function getKey(handedness: string): string {
  return handedness === "left" ? "left" : "right";
}

export class ControllerSplatInputSystem extends createSystem({}) {
  execute(): void {
    const renderer = this.world.renderer as unknown as THREE.WebGLRenderer;
    const xr = renderer?.xr;
    const session = xr?.getSession?.();
    if (!session?.inputSources) return;

    for (const source of session.inputSources) {
      const gamepad = source.gamepad;
      if (!gamepad || gamepad.buttons.length < 6) continue;

      const key = getKey(source.handedness);
      const prev = prevPressed[key] ?? { primary: false, secondary: false };
      const primaryPressed = gamepad.buttons[BUTTON_PRIMARY]?.pressed === true;
      const secondaryPressed = gamepad.buttons[BUTTON_SECONDARY]?.pressed === true;

      // Right controller: A=primary, B=secondary
      if (source.handedness === "right") {
        if (primaryPressed && !prev.primary) toggleSplatState("reflection");
        if (secondaryPressed && !prev.secondary) toggleSplatState("defensiveness");
      }
      // Left controller: X=primary, Y=secondary
      if (source.handedness === "left") {
        if (primaryPressed && !prev.primary) toggleSplatState("curiosity");
        if (secondaryPressed && !prev.secondary) toggleSplatState("stress");
      }

      prevPressed[key] = { primary: primaryPressed, secondary: secondaryPressed };
    }
  }
}

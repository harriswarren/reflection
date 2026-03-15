/**
 * VoiceStatusHud — a canvas-based sprite pinned to the bottom-left of
 * the user's view (works in both VR and desktop). Shows:
 *   - Current state icon + label (mic, speaking, processing, idle)
 *   - Last transcript heard
 *   - Current emotion detected
 *
 * The sprite is a child of the camera so it follows head movement.
 * We draw to a canvas and update the texture when state changes.
 */

import * as THREE from "three";

export type HudState =
  | "idle"        // waiting for wake word
  | "listening"   // mic active, user speaking
  | "processing"  // sent to Brain, waiting for result
  | "speaking"    // TTS playing
  | "error";

const STATE_LABELS: Record<HudState, string> = {
  idle: "Say \"Hello World Model\"",
  listening: "Listening...",
  processing: "Thinking...",
  speaking: "Speaking...",
  error: "Error",
};

// Color dot per state
const STATE_COLORS: Record<HudState, string> = {
  idle: "#888888",
  listening: "#44ff44",
  processing: "#ffaa00",
  speaking: "#4488ff",
  error: "#ff4444",
};

const CANVAS_W = 512;
const CANVAS_H = 200;

export class VoiceStatusHud {
  private sprite: THREE.Sprite;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  private currentState: HudState = "idle";
  private transcript = "";
  private emotion = "";
  private dirty = true;

  constructor(camera: THREE.Camera) {
    this.canvas = document.createElement("canvas");
    this.canvas.width = CANVAS_W;
    this.canvas.height = CANVAS_H;
    this.ctx = this.canvas.getContext("2d")!;

    this.texture = new THREE.CanvasTexture(this.canvas);
    this.texture.minFilter = THREE.LinearFilter;

    const material = new THREE.SpriteMaterial({
      map: this.texture,
      transparent: true,
      depthTest: false,
      depthWrite: false,
    });

    this.sprite = new THREE.Sprite(material);
    // Scale: wide rectangle in bottom-left of view
    this.sprite.scale.set(0.5, 0.2, 1);
    // Position relative to camera: bottom-left, slightly in front
    this.sprite.position.set(-0.32, -0.22, -0.7);
    this.sprite.renderOrder = 20_000;

    camera.add(this.sprite);
    this.redraw();
  }

  setState(state: HudState): void {
    if (state !== this.currentState) {
      this.currentState = state;
      this.dirty = true;
      this.redraw();
      // Update HTML overlay for desktop
      const dot = document.getElementById("status-dot");
      const label = document.getElementById("status-label");
      if (dot) dot.style.background = STATE_COLORS[state];
      if (label) label.textContent = STATE_LABELS[state];
    }
  }

  setTranscript(text: string): void {
    const truncated = text.length > 60 ? text.substring(0, 57) + "..." : text;
    if (truncated !== this.transcript) {
      this.transcript = truncated;
      this.dirty = true;
      this.redraw();
      const el = document.getElementById("status-transcript");
      if (el) el.textContent = truncated;
    }
  }

  setEmotion(emotion: string): void {
    if (emotion !== this.emotion) {
      this.emotion = emotion;
      this.dirty = true;
      this.redraw();
      const el = document.getElementById("status-emotion");
      if (el) el.textContent = emotion ? "Scene: " + emotion : "";
    }
  }

  private redraw(): void {
    if (!this.dirty) return;
    this.dirty = false;

    const ctx = this.ctx;
    const w = CANVAS_W;
    const h = CANVAS_H;

    // Background: semi-transparent dark rounded rect
    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
    roundRect(ctx, 4, 4, w - 8, h - 8, 16);
    ctx.fill();

    // Status dot
    const dotColor = STATE_COLORS[this.currentState];
    ctx.beginPath();
    ctx.arc(32, 40, 12, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();

    // Pulsing ring for listening state (static ring here; animation would need frame loop)
    if (this.currentState === "listening") {
      ctx.beginPath();
      ctx.arc(32, 40, 16, 0, Math.PI * 2);
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // Status label
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 28px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(STATE_LABELS[this.currentState], 54, 40);

    // Transcript line
    if (this.transcript) {
      ctx.fillStyle = "#cccccc";
      ctx.font = "22px sans-serif";
      ctx.fillText(this.transcript, 20, 95);
    }

    // Emotion line
    if (this.emotion) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 24px sans-serif";
      ctx.fillText("Scene: " + this.emotion, 20, 145);
    }

    this.texture.needsUpdate = true;
  }
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

/**
 * VoiceStatusHud — a canvas-based sprite pinned to the bottom-left of
 * the user's view (works in both VR and desktop). Shows:
 *
 *   Line 1:  [dot] Status label  (e.g. "Listening...", "Speaking...")
 *   Line 2:  Model: <what the model is saying/asking>   (blue text)
 *   Line 3:  You: <what the mic is hearing>              (green text)
 *   Line 4:  Scene: <detected emotion>                   (yellow text)
 *
 * The sprite is a child of the camera so it follows head movement.
 */

import * as THREE from "three";

export type HudState =
  | "startup"
  | "wake_word"
  | "listening"
  | "processing"
  | "speaking"
  | "error";

const STATE_LABELS: Record<HudState, string> = {
  startup: "Starting mic...",
  wake_word: "Say \"Hello World Model\"",
  listening: "Your turn — speak now",
  processing: "Thinking...",
  speaking: "Model speaking...",
  error: "Mic Error",
};

const STATE_COLORS: Record<HudState, string> = {
  startup: "#aaaaaa",
  wake_word: "#ffdd44",
  listening: "#44ff44",
  processing: "#ffaa00",
  speaking: "#4488ff",
  error: "#ff4444",
};

const CANVAS_W = 640;
const CANVAS_H = 300;

export class VoiceStatusHud {
  private sprite: THREE.Sprite;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private texture: THREE.CanvasTexture;

  private currentState: HudState = "startup";
  private modelText = "";
  private userText = "";
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
    // Wider and taller to fit more text
    this.sprite.scale.set(0.6, 0.28, 1);
    this.sprite.position.set(-0.28, -0.20, -0.7);
    this.sprite.renderOrder = 20_000;

    camera.add(this.sprite);
    this.redraw();
  }

  setState(state: HudState): void {
    if (state !== this.currentState) {
      this.currentState = state;
      this.dirty = true;
      this.redraw();
      const dot = document.getElementById("status-dot");
      const label = document.getElementById("status-label");
      if (dot) dot.style.background = STATE_COLORS[state];
      if (label) label.textContent = STATE_LABELS[state];
    }
  }

  /** Show the model's spoken text (question or reflection). */
  setModelText(text: string): void {
    const truncated = text.length > 90 ? text.substring(0, 87) + "..." : text;
    if (truncated !== this.modelText) {
      this.modelText = truncated;
      this.dirty = true;
      this.redraw();
      const el = document.getElementById("status-model-text");
      if (el) el.textContent = truncated ? "Model: " + truncated : "";
    }
  }

  /** Show what the mic is hearing (user's speech). */
  setUserText(text: string): void {
    const truncated = text.length > 90 ? text.substring(0, 87) + "..." : text;
    if (truncated !== this.userText) {
      this.userText = truncated;
      this.dirty = true;
      this.redraw();
      const el = document.getElementById("status-transcript");
      if (el) el.textContent = truncated ? "You: " + truncated : "";
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

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0, 0, 0, 0.75)";
    roundRect(ctx, 4, 4, w - 8, h - 8, 16);
    ctx.fill();

    // Row 1: Status dot + label
    const dotColor = STATE_COLORS[this.currentState];
    ctx.beginPath();
    ctx.arc(28, 36, 10, 0, Math.PI * 2);
    ctx.fillStyle = dotColor;
    ctx.fill();

    if (this.currentState === "listening" || this.currentState === "wake_word") {
      ctx.beginPath();
      ctx.arc(28, 36, 14, 0, Math.PI * 2);
      ctx.strokeStyle = dotColor;
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textBaseline = "middle";
    ctx.fillText(STATE_LABELS[this.currentState], 50, 36);

    // Row 2: Model text (blue)
    if (this.modelText) {
      ctx.fillStyle = "#88bbff";
      ctx.font = "20px sans-serif";
      wrapText(ctx, "Model: " + this.modelText, 18, 80, w - 36, 22);
    }

    // Row 3: User text (green)
    if (this.userText) {
      ctx.fillStyle = "#88ff88";
      ctx.font = "20px sans-serif";
      const userY = this.modelText ? 150 : 80;
      wrapText(ctx, "You: " + this.userText, 18, userY, w - 36, 22);
    }

    // Row 4: Emotion (yellow)
    if (this.emotion) {
      ctx.fillStyle = "#fbbf24";
      ctx.font = "bold 22px sans-serif";
      ctx.fillText("Scene: " + this.emotion, 18, h - 24);
    }

    this.texture.needsUpdate = true;
  }
}

/** Draw text with simple word wrapping. */
function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string, x: number, y: number, maxWidth: number, lineHeight: number,
): void {
  const words = text.split(" ");
  let line = "";
  let drawY = y;
  for (const word of words) {
    const testLine = line ? line + " " + word : word;
    if (ctx.measureText(testLine).width > maxWidth && line) {
      ctx.fillText(line, x, drawY);
      line = word;
      drawY += lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) ctx.fillText(line, x, drawY);
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

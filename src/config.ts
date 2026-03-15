/**
 * Configuration for Inner World Model — Cognitive Reflection VR.
 * For Vite: set VITE_BRAIN_API_URL and optionally VITE_TTS_API_KEY in .env or .env.local.
 */

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as { VITE_BRAIN_API_URL?: string; VITE_TTS_API_KEY?: string; VITE_WORLDLABS_API_KEY?: string; VITE_SPLAT_URL?: string });

// Base URL of the Brain (Python FastAPI) service. No trailing slash.
// Default uses the Vite proxy at /brain so the headset can reach the Brain API
// over the same HTTPS origin (avoids mixed-content blocking in WebXR).
export const BRAIN_API_URL =
  env.VITE_BRAIN_API_URL != null && env.VITE_BRAIN_API_URL !== "" ? env.VITE_BRAIN_API_URL : "/brain";

// Optional: TTS provider API key (Sesame/DeepInfra or ElevenLabs). Prefer env for production.
export const TTS_API_KEY = env.VITE_TTS_API_KEY != null ? env.VITE_TTS_API_KEY : "";

// Optional: World Labs (Marble) API key for programmatic world generation. Prefer calling from Brain backend so the key is not in the frontend.
export const WORLDLABS_API_KEY = env.VITE_WORLDLABS_API_KEY != null ? env.VITE_WORLDLABS_API_KEY : "";

// Splat URL for the main world. Default = neutral (Venice.spz); controller/UI can switch to state-specific splats.
export const SPLAT_URL = env.VITE_SPLAT_URL != null && env.VITE_SPLAT_URL !== "" ? env.VITE_SPLAT_URL : "/splats/Venice.spz";

/** Neutral environment (no cognitive state). */
export const SPLAT_URL_NEUTRAL = "/splats/Venice.spz";

/** Splat URL per cognitive state — used when controller or voice sets a non-neutral state. */
export const SPLAT_URL_BY_STATE: Record<string, string> = {
  reflection: "/splats/Venice-Reflection.spz",
  defensiveness: "/splats/Venice-Defensiveness.spz",
  curiosity: "/splats/Venice-Curiosity.spz",
  stress: "/splats/Venice-Stress.spz",
};

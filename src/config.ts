/**
 * Configuration for Inner World Model — Cognitive Reflection VR.
 * For Vite: set VITE_BRAIN_API_URL and optionally VITE_TTS_API_KEY in .env or .env.local.
 */

const env = typeof import.meta !== "undefined" && import.meta.env ? import.meta.env : ({} as { VITE_BRAIN_API_URL?: string; VITE_TTS_API_KEY?: string; VITE_WORLDLABS_API_KEY?: string; VITE_SPLAT_URL?: string });

// Base URL of the Brain (Python FastAPI) service. No trailing slash.
export const BRAIN_API_URL =
  env.VITE_BRAIN_API_URL != null && env.VITE_BRAIN_API_URL !== "" ? env.VITE_BRAIN_API_URL : "http://localhost:8000";

// Optional: TTS provider API key (Sesame/DeepInfra or ElevenLabs). Prefer env for production.
export const TTS_API_KEY = env.VITE_TTS_API_KEY != null ? env.VITE_TTS_API_KEY : "";

// Optional: World Labs (Marble) API key for programmatic world generation. Prefer calling from Brain backend so the key is not in the frontend.
export const WORLDLABS_API_KEY = env.VITE_WORLDLABS_API_KEY != null ? env.VITE_WORLDLABS_API_KEY : "";

// Splat URL for the main world (Marble Gaussian splat). Use a path under public/ or a full URL from Marble API.
// Default matches default cognitive state (reflection); state-driven switching uses SPLAT_URL_BY_STATE.
export const SPLAT_URL = env.VITE_SPLAT_URL != null && env.VITE_SPLAT_URL !== "" ? env.VITE_SPLAT_URL : "/splats/Venice-Reflection.spz";

/** Splat URL per cognitive state — environment switches to this when dominant state changes. */
export const SPLAT_URL_BY_STATE: Record<string, string> = {
  reflection: "/splats/Venice-Reflection.spz",
  defensiveness: "/splats/Venice-Defensiveness.spz",
  curiosity: "/splats/Venice-Curiosity.spz",
  stress: "/splats/Venice-Stress.spz",
};

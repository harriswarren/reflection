/**
 * World Labs Marble API client for programmatic world generation.
 * Use when you want to generate worlds from code instead of the Marble web app.
 * API key: set VITE_WORLDLABS_API_KEY in .env, or call generation from your Brain backend and pass splat URLs to the frontend.
 * @see https://docs.worldlabs.ai/api
 */

import { WORLDLABS_API_KEY } from "./config.js";

const MARBLE_API_BASE = "https://api.worldlabs.ai";

/** Response from worlds:generate — an operation to poll. */
export interface MarbleOperation {
  operation_id: string;
  done: boolean;
  error: string | null;
  metadata?: { world_id?: string };
  response?: MarbleWorldSnapshot | null;
}

/** World snapshot returned when the operation is done. */
export interface MarbleWorldSnapshot {
  id: string;
  assets?: {
    splats?: { spz_urls?: { "100k"?: string; "500k"?: string; full_res?: string } };
    mesh?: { collider_mesh_url?: string };
  };
}

/** Result after generation: URLs to use with GaussianSplatLoader. */
export interface MarbleWorldAssets {
  /** Use with splatUrl (e.g. "500k" for VR). */
  splatUrl: string;
  /** Use with meshUrl for locomotion; may be empty. */
  meshUrl: string;
  worldId: string;
}

/**
 * Starts world generation. Returns an operation_id; call pollMarbleOperation until done, then use response.assets.
 * Uses text prompt by default; add options for model (e.g. "Marble 0.1-mini" for faster draft).
 */
export async function createMarbleWorld(options: {
  displayName: string;
  textPrompt: string;
  model?: string;
}): Promise<{ operation_id: string }> {
  if (!WORLDLABS_API_KEY) {
    throw new Error("VITE_WORLDLABS_API_KEY is not set. Add it to .env or generate worlds from your backend.");
  }
  const body: Record<string, unknown> = {
    display_name: options.displayName,
    world_prompt: {
      type: "text",
      text_prompt: options.textPrompt,
    },
  };
  if (options.model) body.model = options.model;

  const res = await fetch(`${MARBLE_API_BASE}/marble/v1/worlds:generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "WLT-Api-Key": WORLDLABS_API_KEY,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Marble API error: ${res.status} ${await res.text()}`);
  const data = (await res.json()) as { operation_id: string };
  return data;
}

/**
 * Polls the operation until done (or error). Poll interval 5s; full world ~5 min, mini ~30–45 s.
 * Returns the world snapshot with assets.splats.spz_urls and assets.mesh.collider_mesh_url.
 */
export async function pollMarbleOperation(
  operationId: string,
  options?: { pollIntervalMs?: number; maxWaitMs?: number }
): Promise<MarbleWorldSnapshot> {
  if (!WORLDLABS_API_KEY) throw new Error("VITE_WORLDLABS_API_KEY is not set.");
  const pollIntervalMs = options?.pollIntervalMs ?? 5000;
  const maxWaitMs = options?.maxWaitMs ?? 600_000; // 10 min
  const start = Date.now();

  while (Date.now() - start < maxWaitMs) {
    const res = await fetch(`${MARBLE_API_BASE}/marble/v1/operations/${operationId}`, {
      headers: { "WLT-Api-Key": WORLDLABS_API_KEY },
    });
    if (!res.ok) throw new Error(`Marble API error: ${res.status} ${await res.text()}`);
    const op = (await res.json()) as MarbleOperation;
    if (op.error) throw new Error(`Marble operation failed: ${op.error}`);
    if (op.done && op.response) return op.response;
    await new Promise((r) => setTimeout(r, pollIntervalMs));
  }
  throw new Error("Marble operation timed out.");
}

/**
 * Extracts splat URL and optional collider URL from a completed world snapshot.
 * Prefers 500k for VR; falls back to 100k then full_res.
 */
export function getMarbleAssets(snapshot: MarbleWorldSnapshot): MarbleWorldAssets {
  const spz = snapshot.assets?.splats?.spz_urls;
  const splatUrl = spz?.["500k"] ?? spz?.["100k"] ?? spz?.full_res ?? "";
  const meshUrl = snapshot.assets?.mesh?.collider_mesh_url ?? "";
  if (!splatUrl) throw new Error("World has no splat URLs.");
  return { splatUrl, meshUrl, worldId: snapshot.id };
}

/**
 * Full flow: create world from text prompt, poll until done, return assets for GaussianSplatLoader.
 */
export async function generateMarbleWorldAndGetAssets(options: {
  displayName: string;
  textPrompt: string;
  model?: string;
}): Promise<MarbleWorldAssets> {
  const { operation_id } = await createMarbleWorld(options);
  const snapshot = await pollMarbleOperation(operation_id);
  return getMarbleAssets(snapshot);
}

# Integrating Marble (World Labs) into the Hack

This project already uses **SparkJS** for Gaussian splat rendering, which is the same stack [Marble recommends for web](https://docs.worldlabs.ai/marble/export/gaussian-splat/spark). You can use Marble in two ways: **manual export** (fast for MVP) or **API** (for dynamic worlds).

**API setup (key + how to call):** See **[docs/WORLDLABS_API_SETUP.md](WORLDLABS_API_SETUP.md)** for step-by-step World Labs API key and interface (TypeScript and Python).

References: [Marble docs](https://docs.worldlabs.ai/), [Export overview](https://docs.worldlabs.ai/marble/export/gaussian-splat/index), [World Labs API Quickstart](https://docs.worldlabs.ai/api).

---

## Steps at a glance

| Goal | Path | What to do |
|------|------|------------|
| **Use a Marble world in the app** | Manual | 1) Create world at [marble.worldlabs.ai](https://marble.worldlabs.ai) → 2) Export as Gaussian splat (.spz) → 3) Put file in `public/splats/` or host → 4) Set `splatUrl` (and optional `meshUrl`) on `GaussianSplatLoader` in `src/index.ts`. |
| **Generate worlds from code** | API | 1) Get API key from [platform.worldlabs.ai](https://platform.worldlabs.ai) → 2) Use `src/marbleClient.ts` (or call API from your Brain backend) → 3) Use returned `splatUrl` / `meshUrl` in `GaussianSplatLoader`. |

---

## Option A: Manual export (quickest for the hack)

Use the Marble web app to create worlds, then export and load them in this app.

### 1. Create a world in Marble

1. Go to **[marble.worldlabs.ai](https://marble.worldlabs.ai)** and sign in (you already have an account).
2. Open **Create** and choose an input:
   - **Text prompt** – e.g. “A floating island hub with two bridges and a distant island in fog” (fits your Inner World Model concept).
   - **Preset** – pick a preset and optionally edit.
   - **Image / Video / Panorama / Chisel** – if you have specific assets.
3. Generate the world. Draft (~20 s) is faster; full world ~5 min ([generation times](https://docs.worldlabs.ai/#generation-times)).

### 2. Export as Gaussian splat (.spz)

1. When the world is ready, open it and use **Export** (or the world’s asset panel).
2. Choose **Gaussian splat** export. You get **.spz** files (e.g. 100k, 500k, full res).  
   - Lower res (100k / 500k) = faster load and better for VR/Pico; see [Export from Marble](https://docs.worldlabs.ai/marble/export/gaussian-splat/index).
3. Download the **.spz** you want (e.g. `500k` for a balance of quality and performance).
4. Optional: download the **collider mesh** (GLB) for locomotion/teleport if Marble offers it in the same export flow.

### 3. Add the file to the project

- **Option 1 – Local:** Put the file in `public/splats/` (create the folder if needed), e.g.  
  `public/splats/inner-world.spz`
- **Option 2 – Hosted:** Upload to object storage or a CDN and use the public URL.

### 4. Point the app at the Marble splat

In `src/index.ts`, the entity that has `GaussianSplatLoader` currently uses the default `splatUrl`. Set it to your Marble export:

**Local file:**
```ts
splatEntity.addComponent(GaussianSplatLoader, {
  splatUrl: "/splats/inner-world.spz",
  meshUrl: "",  // or "/splats/inner-world-collider.glb" if you have it
  autoLoad: true,
  animate: true,
  enableLod: true,
});
```

**Remote URL:**
```ts
splatEntity.addComponent(GaussianSplatLoader, {
  splatUrl: "https://your-cdn.com/inner-world.spz",
  meshUrl: "https://your-cdn.com/inner-world-collider.glb",
  autoLoad: true,
  animate: true,
  enableLod: true,
});
```

If you use a **single entity** and only change `splatUrl`/`meshUrl` (e.g. per cognitive state), you can call the loader system’s `unload` then `load` with the new URL to swap worlds at runtime.

### 5. Optional: collision mesh for locomotion

- If you have a **collider mesh** from Marble (or from the [World Labs API](https://docs.worldlabs.ai/api) response: `assets.mesh.collider_mesh_url`), set it as `meshUrl` so IWSDK hit-testing works for teleport/locomotion.

That’s all you need for **Option A**: create in Marble → export .spz → put in `public/splats/` or host → set `splatUrl` (and optionally `meshUrl`) in the app.

---

## Option B: World Labs API (programmatic worlds)

Use the [World Labs API](https://docs.worldlabs.ai/api) to generate worlds from code. Good for:

- One-off generation of a “base” world for the hack, or
- Later: different worlds per cognitive state (e.g. “stress” = foggy world, “curiosity” = bright island).

### 1. Get an API key

1. Sign in at **[platform.worldlabs.ai](https://platform.worldlabs.ai)** (same as Marble).
2. Add a payment method and purchase credits on the [billing page](https://platform.worldlabs.ai/billing).
3. Create an API key on the [API keys page](https://platform.worldlabs.ai/api-keys).  
Keep the key secret (e.g. env var, not in git).

### 2. Generate a world via API

**Request:** `POST https://api.worldlabs.ai/marble/v1/worlds:generate`

- Headers: `Content-Type: application/json`, `WLT-Api-Key: YOUR_API_KEY`
- Body example (text prompt):

```json
{
  "display_name": "Inner World Hub",
  "world_prompt": {
    "type": "text",
    "text_prompt": "A minimal floating island hub with two narrow bridges and a distant island in mist, moody lighting"
  }
}
```

- For faster iteration use `"model": "Marble 0.1-mini"` (draft quality, ~30–45 s). Omit for best quality (~5 min).

**Response:** You get an `operation_id`. Poll until the operation is done:

- `GET https://api.worldlabs.ai/marble/v1/operations/{operation_id}`  
- Header: `WLT-Api-Key: YOUR_API_KEY`

When `done === true`, the `response` (or the world fetched by `world_id`) contains:

- `response.assets.splats.spz_urls`: `100k`, `500k`, `full_res` – use one as `splatUrl` (e.g. `500k` for VR).
- `response.assets.mesh.collider_mesh_url`: use as `meshUrl` if present.

### 3. Use in this repo

- A small **Marble API client** is in `src/marbleClient.ts`: it calls `worlds:generate` and polls until done, then returns the world object (including `assets.splats.spz_urls` and `assets.mesh.collider_mesh_url`).
- Store your API key in `.env` as `VITE_WORLDLABS_API_KEY` (only if you need to call the API from the frontend; otherwise call from your Brain backend and pass splat URLs to the client).
- **Security:** Prefer calling the World Labs API from your **Brain (Python) service** and returning `splatUrl` (and optionally `meshUrl`) to the WebXR app, so the API key never ships to the browser.

---

## Summary

| Step | Option A (manual) | Option B (API) |
|------|-------------------|----------------|
| 1 | Create world in [marble.worldlabs.ai](https://marble.worldlabs.ai) | Get API key from [platform.worldlabs.ai](https://platform.worldlabs.ai) |
| 2 | Export Gaussian splat (.spz), optional collider (.glb) | POST `worlds:generate`, poll operation |
| 3 | Put .spz in `public/splats/` or host | Use `assets.splats.spz_urls` (e.g. 500k) and `assets.mesh.collider_mesh_url` |
| 4 | Set `splatUrl` (and `meshUrl`) on `GaussianSplatLoader` | Same: set `splatUrl` / `meshUrl` from API response |

For the **Inner World Model**, a practical approach is:

- Use **Option A** for the hack: create one or two Marble worlds (e.g. “calm hub”, “tense/foggy”) in the web app, export .spz, drop into `public/splats/`, and switch `splatUrl` (or swap entities) based on `dominant_state` if you want the environment to change.
- Use **Option B** if you want to generate worlds from your Brain service or from the frontend (with API key in backend or env).

The app already supports remote `splatUrl` and `meshUrl`; no changes to SparkJS or the loader are required beyond pointing them at your Marble-derived assets.

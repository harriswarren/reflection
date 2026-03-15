# World Labs (Marble) API — Setup & Interface

How to get an API key and call the Marble world model from this project. Reference: [World Labs API Quickstart](https://docs.worldlabs.ai/api).

---

## 1. Get an API key

1. Go to **[platform.worldlabs.ai](https://platform.worldlabs.ai)** and sign in (use your Marble account).
2. **Billing:** Add a payment method and purchase credits on the [billing page](https://platform.worldlabs.ai/billing).
3. **API key:** Open the [API keys page](https://platform.worldlabs.ai/api-keys), create a key, and copy it. Store it somewhere safe (e.g. password manager); you won’t see it again.

---

## 2. Where to use the key

| Where you call the API | Where to put the key | Notes |
|------------------------|----------------------|--------|
| **WebXR app (browser)** | `.env`: `VITE_WORLDLABS_API_KEY=wl_...` | Key is in the client; only use for dev or if you accept that. |
| **Brain (Python backend)** | Env var or `.env`: `WORLDLABS_API_KEY=wl_...` | **Recommended.** Key stays server-side; backend calls World Labs and returns `splatUrl` / `meshUrl` to the frontend. |

---

## 3. Interface from the WebXR app (TypeScript)

If the key is in the frontend (e.g. for quick testing):

1. **Add the key to `.env`** (create from `.env.example` if needed):
   ```env
   VITE_WORLDLABS_API_KEY=wl_your_actual_key_here
   ```
2. **Restart the dev server** so Vite picks up the new env (`npm run dev`).
3. **Use the existing client** in `src/marbleClient.ts`:

```ts
import { generateMarbleWorldAndGetAssets } from "./marbleClient.js";

// Full flow: generate world, poll until done, get URLs for the loader
const assets = await generateMarbleWorldAndGetAssets({
  displayName: "Inner World Hub",
  textPrompt: "A minimal floating island hub with two bridges and a distant island in mist, moody lighting",
  model: "Marble 0.1-mini",  // optional: faster draft (~30–45 s); omit for best quality (~5 min)
});

console.log(assets.splatUrl, assets.meshUrl, assets.worldId);
// Set these on GaussianSplatLoader: splatUrl = assets.splatUrl, meshUrl = assets.meshUrl
```

**API surface (from `marbleClient.ts`):**

| Function | Purpose |
|----------|---------|
| `createMarbleWorld({ displayName, textPrompt, model? })` | `POST /marble/v1/worlds:generate` → returns `operation_id`. |
| `pollMarbleOperation(operationId, options?)` | `GET /marble/v1/operations/{id}` until done → returns world snapshot with `assets.splats.spz_urls` and `assets.mesh.collider_mesh_url`. |
| `getMarbleAssets(snapshot)` | Turns snapshot into `{ splatUrl, meshUrl, worldId }` (prefers 500k for VR). |
| `generateMarbleWorldAndGetAssets(options)` | Runs create → poll → getMarbleAssets. |

**Request format (World Labs):**

- **Endpoint:** `POST https://api.worldlabs.ai/marble/v1/worlds:generate`
- **Headers:** `Content-Type: application/json`, `WLT-Api-Key: YOUR_API_KEY`
- **Body (text prompt):**
  ```json
  {
    "display_name": "My World",
    "world_prompt": {
      "type": "text",
      "text_prompt": "A mystical forest with glowing mushrooms"
    }
  }
  ```
- **Optional:** `"model": "Marble 0.1-mini"` for faster, cheaper draft.

**Response:** You get `operation_id`. Poll `GET https://api.worldlabs.ai/marble/v1/operations/{operation_id}` with header `WLT-Api-Key` until `done === true`; then `response.assets.splats.spz_urls` (100k, 500k, full_res) and `response.assets.mesh.collider_mesh_url`.

---

## 4. Interface from the Brain backend (Python)

Keeping the API key on the server is safer. Add a small client in the Brain service and expose an endpoint that returns `splatUrl` (and optionally `meshUrl`) so the WebXR app never sees the key.

A minimal Python client is in **`brain/worldlabs_client.py`**. Example usage from your FastAPI app:

```python
from worldlabs_client import create_world, poll_until_done, get_asset_urls

# Start generation
op = create_world(
    display_name="Inner World Hub",
    text_prompt="A minimal floating island with two bridges and a distant island in mist",
    model="Marble 0.1-mini",  # optional
)
# Poll until done (blocking)
snapshot = poll_until_done(op["operation_id"])
splat_url, mesh_url = get_asset_urls(snapshot)
# Return splat_url, mesh_url to the frontend
```

Set the env var before running the Brain service:

```bash
export WORLDLABS_API_KEY=wl_your_actual_key_here
# or in .env in the brain folder
```

---

## 5. Quick test — verify connection

### Option A: Python (recommended if you have the Brain env)

1. Install deps: `pip install requests` (or `pip install -r brain/requirements.txt`).
2. Put your key in `.env` as `VITE_WORLDLABS_API_KEY=wl_...` — the test script also reads that. Or set `WORLDLABS_API_KEY` in the environment.
3. From the project root run:
   ```bash
   python brain/test_worldlabs.py
   ```
   The script starts a small world generation (Marble 0.1-mini), polls until done, and prints `splatUrl` / `meshUrl`. If that succeeds, the connection works.

### Option B: curl (any machine)

Replace `wl_YOUR_KEY` with your key. If you get an `operation_id` back, the connection works.

```bash
curl -s -X POST "https://api.worldlabs.ai/marble/v1/worlds:generate" \
  -H "Content-Type: application/json" \
  -H "WLT-Api-Key: wl_YOUR_KEY" \
  -d "{\"display_name\":\"Test\",\"world_prompt\":{\"type\":\"text\",\"text_prompt\":\"A small room\"},\"model\":\"Marble 0.1-mini\"}"
```

PowerShell (one line):

```powershell
$key = "wl_YOUR_KEY"
$body = '{"display_name":"Test","world_prompt":{"type":"text","text_prompt":"A small room"},"model":"Marble 0.1-mini"}'
Invoke-RestMethod -Uri "https://api.worldlabs.ai/marble/v1/worlds:generate" -Method Post -Headers @{"Content-Type"="application/json"; "WLT-Api-Key"=$key} -Body $body
```

Expected: JSON with `operation_id`. Error 401 = bad or missing key.

### Option C: Browser (WebXR app)

1. Add `VITE_WORLDLABS_API_KEY=wl_...` to `.env`, then run `npm run dev`.
2. Open the app in the browser, open DevTools → Console, and run:
   ```js
   import('./src/marbleClient.js').then(m => m.generateMarbleWorldAndGetAssets({
     displayName: 'Test',
     textPrompt: 'A small empty room',
     model: 'Marble 0.1-mini'
   })).then(a => console.log('OK', a)).catch(e => console.error(e))
   ```
   (If the app uses dynamic imports you may need to expose the client on `window` for a quick test.) Alternatively, add a temporary “Test Marble” button in the UI that calls `generateMarbleWorldAndGetAssets` and logs the result.

From the Brain backend (or a one-off script):

1. Set `WORLDLABS_API_KEY`.
2. Call `create_world` then `poll_until_done` (or use the TS client with `VITE_WORLDLABS_API_KEY` set and call `generateMarbleWorldAndGetAssets` from the browser console).
3. Confirm you get back a `splatUrl` (and optionally `meshUrl`).

Then in the WebXR app, set `GaussianSplatLoader` to that `splatUrl` (and `meshUrl`) — either hardcoded for a pre-generated world or from a response from your Brain API.

---

## Links

- [World Labs Platform](https://platform.worldlabs.ai/) — sign in, billing, API keys  
- [API Quickstart](https://docs.worldlabs.ai/api) — endpoints and examples  
- [Marble Export (Spark/Web)](https://docs.worldlabs.ai/marble/export/gaussian-splat/spark) — using .spz in SparkJS/WebXR

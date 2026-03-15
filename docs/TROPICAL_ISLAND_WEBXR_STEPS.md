# Tropical Island Scene → WebXR App: Steps

Create a tropical island environment with the Marble world model and run it in the WebXR app.

---

## Step 1: Create the tropical island world in Marble

Choose one:

### Option A: Marble web app (no code)

1. Go to **[marble.worldlabs.ai](https://marble.worldlabs.ai)** and sign in.
2. **Create** → **Text prompt**.
3. Enter a prompt, e.g.:
   - *“A tropical island with palm trees, white sand beach, turquoise water, and distant mountains, sunny day.”*
   - Or use a **Preset** and edit the prompt.
4. Generate (Draft ~20 s, or full world ~5 min).
5. When ready, go to **Export** → **Gaussian splat** and download the **.spz** (e.g. 500k for VR).

### Option B: World Labs API (from code)

1. Ensure `VITE_WORLDLABS_API_KEY` is set in `.env`.
2. Use the API to generate the world (e.g. from the browser console or a small script):

```ts
import { generateMarbleWorldAndGetAssets } from "./src/marbleClient.js";
const assets = await generateMarbleWorldAndGetAssets({
  displayName: "Tropical Island",
  textPrompt: "A tropical island with palm trees, white sand beach, turquoise water, sunny day",
  model: "Marble 0.1-mini",  // faster; omit for best quality
});
console.log(assets.splatUrl, assets.meshUrl);
```

3. Use the returned `splatUrl` (and optional `meshUrl`) in Step 3.

---

## Step 2: Get the .spz (and optional collider) into the project

- **If you used the web app:** You downloaded a file. Put it in the project as:
  - **Local:** `public/splats/tropical-island.spz`  
  - Create the folder if needed: `public/splats/`.
- **If you used the API:** You have a **URL**. You can either:
  - Use that URL directly in the app (Step 3), or
  - Download the file from the URL and place it in `public/splats/tropical-island.spz` for a fixed path.

---

## Step 3: Point the WebXR app at the splat

The app already uses a configurable splat URL:

- **Default:** `/splats/tropical-island.spz` (so the file must be at `public/splats/tropical-island.spz`).
- **Override:** In `.env` set:
  ```env
  VITE_SPLAT_URL=/splats/tropical-island.spz
  ```
  or a full URL from the Marble API:
  ```env
  VITE_SPLAT_URL=https://...
  ```

No code change needed unless you want a different default in `src/config.ts`.

---

## Step 4: Run the WebXR app (dev)

```bash
npm run dev
```

Open **https://localhost:8081** in a browser. You should see the tropical island splat. Use **Enter XR** to try it in VR (or the headset simulator).

---

## Step 5: Build the WebXR app for production

```bash
npm run build
```

Output is in **`dist/`**. To try it locally:

```bash
npm run preview
```

To deploy: upload the contents of `dist/` to a static host (e.g. Cloudflare Pages, Netlify) or serve over HTTPS. On Pico, open that URL in **PICO Browser** and enter XR.

---

## Checklist

| Step | Action |
|------|--------|
| 1 | Create tropical island in Marble (web app or API). |
| 2 | Put `.spz` in `public/splats/tropical-island.spz` or note the Marble URL. |
| 3 | Set `VITE_SPLAT_URL` in `.env` if using a different path or URL. |
| 4 | `npm run dev` → open https://localhost:8081. |
| 5 | `npm run build` → deploy `dist/` for production / Pico. |

---

## Optional: Collider for locomotion

If you have a **collider mesh** (e.g. from Marble export or API `meshUrl`), put it in `public/splats/` and set it on the loader so teleport/locomotion works. Right now `meshUrl` is empty; you can add a `VITE_MESH_URL` in config and pass it to `GaussianSplatLoader` if you add support for it in `src/config.ts` and `src/index.ts`.

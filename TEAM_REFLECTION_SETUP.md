# Team Reflection – SensAI WebXR World Models Setup

Quick reference for the [sensai-webxr-worldmodels](https://github.com/V4C38/sensai-webxr-worldmodels) kit (SensAI Hack – Worlds in Action).

## Run the app

```bash
npm run dev
```

- Opens at **https://localhost:8081** (Vite + mkcert for HTTPS; browser may prompt to trust the cert once).
- Use a **WebXR-capable browser** (Chrome/Edge recommended).
- **Headset simulator**: with `npm run dev`, use the on-page simulator to test without a headset.

## Add your own world (Gaussian splat)

1. **Splat asset**: Get a `.spz` or `.ply` (e.g. export from [Marble / World Labs](https://marble.worldlabs.ai/) as Gaussian splat).
2. **Put it where the app can load it**:
   - Option A: `public/splats/your-world.spz` → use `splatUrl: "/splats/your-world.spz"`.
   - Option B: Host on a CDN/object storage and use the full URL as `splatUrl`.
3. **Wire it in** in `src/index.ts`: the entity with `GaussianSplatLoader` already exists; set its component props (e.g. in code or via a system) to your `splatUrl` (and optional `meshUrl` for collision).
4. **Collision mesh (optional)**: For locomotion/teleport, add a `.gltf`/`.glb` and set `meshUrl` so hit-testing works.

Default in code is `./splats/sensai.spz`. If that file is missing, add a splat to `public/splats/` or change the URL to one you provide.

## Useful links

- [IWSDK (Immersive Web SDK)](https://elixrjs.io/) – locomotion, grabbing, spatial UI
- [SparkJS](https://sparkjs.dev/) – Gaussian splat rendering (this project uses v2.0 preview with LoD)
- [Marble (World Labs)](https://marble.worldlabs.ai/) – create worlds, export as splats
- [SensAI Hack](https://sensaihack.com/) | [SensAI Hackademy](https://sensaihackademy.com/)

## Build for submission / deploy

```bash
npm run build
npm run preview   # local preview of dist/
```

Deploy the `dist/` folder (e.g. static hosting; repo recommends Cloudflare).

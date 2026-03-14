# Pico Headset + WebXR (and PICO Emulator, if needed)

**TL;DR for your hack:** You’re using **WebXR** on the **Pico headset**. You do **not** need the PICO Emulator for that. Develop on desktop with the in-browser simulator, then test on the real Pico with PICO Browser. If you ever need the emulator (e.g. for a Unity build), use the **Unity** path — it’s the one PICO documents and it’s the easiest.

---

## Your setup: WebXR + real Pico headset

- **Build:** This repo (Vite + IWSDK + SparkJS). No Unity or Android app.
- **Dev on desktop:** Run `npm run dev`, open https://localhost:8081. The **IWER** plugin injects a headset simulator (Meta Quest–style) so you can test without a headset.
- **Test on Pico:** Serve the app over HTTPS (e.g. `npm run build` and deploy to Cloudflare, or ngrok to your dev server). On the **Pico headset**, open **PICO Browser**, go to your URL, tap **Enter XR**.
- **Emulator:** Not required. The PICO Emulator runs **native** apps (Unity or Android), not WebXR in a browser.

---

## If you ever want to use the PICO Emulator

The [PICO Emulator (Beta)](https://developer.picoxr.com/document/unity/pico-emulator/) simulates PICO 4 hardware so you can run a **native** app (Unity or Android build) on your PC without a physical headset. It does **not** run WebXR or a browser.

### Unity vs Android — which to use?

| Path        | What it runs                    | Easiest? | Notes |
|------------|----------------------------------|----------|--------|
| **Unity**  | Apps built with PICO Unity SDK   | **Yes**  | PICO’s docs and tools are centered on Unity. Emulator install is under [Install PICO Emulator](https://developer.picoxr.com/document/spatial-toolkit/install-pico-emulator/) (Spatial Toolkit) and [PICO Emulator (Beta)](https://developer.picoxr.com/document/unity/pico-emulator/). |
| **Android**| Native Android APK (PICO SDK/NDK)| No       | Requires Android Studio, Android SDK/NDK, and PICO Android SDK. Less documented for the emulator workflow. |

**Recommendation:** If you use the emulator at all, use **Unity**. It’s the path PICO supports with clear install and run steps.

### How to install (Unity path)

1. **Unity**  
   Install Unity (version per [PICO Unity requirements](https://developer.picoxr.com/document/unity/hardware-and-software-requirements/)).

2. **PICO Unity SDK**  
   Get the [PICO Unity Integration SDK](https://github.com/pico-developer/pico-unity-integration-sdk) (or via PICO Developer resources) and add it to your Unity project.

3. **PICO Emulator**  
   - Follow [Install PICO Emulator](https://developer.picoxr.com/document/spatial-toolkit/install-pico-emulator/) (Spatial Toolkit / emulator install).  
   - Or use the instructions under [PICO Emulator (Beta)](https://developer.picoxr.com/document/unity/pico-emulator/).  
   Typically you install an emulator build (e.g. Windows) and/or enable the emulator in the Unity–PICO workflow so that when you hit Play or build and run, the app runs in the emulator instead of on a device.

4. **Run**  
   Build and run your Unity project with the PICO target; choose the emulator as the run target so it opens in the PICO Emulator window.

This is only relevant if you add a **separate** Unity build (e.g. for store submission). For the **WebXR hack**, stick with desktop browser + real Pico headset and skip the emulator.

---

## Summary

| Goal                         | Use |
|-----------------------------|-----|
| Develop WebXR app           | This repo; `npm run dev`; IWER simulator in browser. |
| Test WebXR on Pico          | Deploy to HTTPS; open URL in **PICO Browser** on the headset. |
| Run native app without headset | PICO Emulator via **Unity** (easiest); install per PICO docs above. |
| Run WebXR in “emulator”     | Not supported; use desktop simulator + real Pico. |

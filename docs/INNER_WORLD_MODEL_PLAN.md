# Inner World Model — Cognitive Reflection VR  
## Technical Plan: Pico 4, WebXR, Sesame Voice

**Team Reflection · SensAI Hack — Worlds in Action**

This document aligns your concept with the **sensai-webxr-worldmodels** stack (WebXR + IWSDK + SparkJS), **Pico 4**, and the **Sesame** voice model, and gives concrete next steps.

**Key project assets:**
- **[docs/TECH_STACK_PIPELINE.md](TECH_STACK_PIPELINE.md)** – Canonical pipeline: User voice → Sesame STT → Brain API → dominant_state/score/next_question → WebXR → PICO → animate environment.
- **[docs/STATE_ENVIRONMENT_MAPPING.md](STATE_ENVIRONMENT_MAPPING.md)** – State → environment mapping and voice rules (source: `docs/plan.txt`).
- **[brain/prompts.py](../brain/prompts.py)** – System prompt and `build_user_prompt()` for the Brain (FastAPI / LLM) service.
- **[brain/README.md](../brain/README.md)** – Brain service contract and usage.

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│  Pico 4 Headset (PICO Browser)  OR  Desktop (Chrome/Edge) for dev            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │  WebXR App (this repo: IWSDK + Three.js + SparkJS)                    │  │
│  │  • Minimal world: floating island, bridges, distant islands, fog      │  │
│  │  • State-driven triggers: dominant_state → env changes                 │  │
│  │  • Voice: Sesame STT → Brain API → state → WebXR → PICO → animate env │  │
│  └───────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                        │
          ┌─────────────────────────────┼─────────────────────────────┐
          ▼                             ▼                             ▼
   [Sesame STT]                  [Brain Service]               [TTS optional]
   User voice → transcript       POST /infer                  voice_reflection + next_question
                                 Python FastAPI               (Sesame / ElevenLabs)
                                 → dominant_state, scores,
                                   voice_reflection, next_question
```

- **WebXR app**: Single codebase; runs in PICO Browser on Pico 4 and in desktop browsers for iteration.
- **Brain service**: Separate Python service (Paula); WebXR app calls it via `POST /infer` with `response_text`, gets `dominant_state`, `voice_reflection`, `next_question`.
- **Voice**: Sesame STT (user voice → transcript); Brain returns `voice_reflection` and `next_question`; TTS (Sesame or ElevenLabs) for playback in headset.

---

## 2. Pico 4 + WebXR

### 2.1 Support and browser

- **Pico 4 supports WebXR** via the built-in **PICO Browser** (Chromium-based) and optionally **Wolvic** ([PICO Developer](https://developer.picoxr.com/blog/web/), [heyVR.io](https://developer.picoxr.com/blog/oru5hv2u/)).
- Web apps can be distributed through the PICO Store (e.g. first WebXR app: heyVR.io).

### 2.2 What to do in this repo

- **Device target**: The current [vite.config.ts](../vite.config.ts) uses `injectIWER({ device: "metaQuest3", ... })`. IWER is the in-browser headset simulator for **development**. For **Pico 4**:
  - **Dev on desktop**: Keep `metaQuest3` (or try `"pico"` if the plugin supports it) for simulator; test real WebXR on Pico 4 by loading the app from the headset.
  - **Test on Pico 4**: Serve the app over HTTPS (e.g. `npm run build` + deploy to Cloudflare, or `npm run dev` with your PC’s LAN URL). On Pico 4, open PICO Browser, go to `https://<your-url>`, enter VR when prompted.
- **Three.js**: The project uses `super-three@0.181.0` (r181). Some older Three.js versions had Pico 4 issues (e.g. r172); if you see rendering bugs on Pico 4, we can add a note or fallback (e.g. disable a specific feature on Pico).
- **HTTPS**: WebXR and microphone (for voice) require **secure context**. Use `vite-plugin-mkcert` in dev (already there); in production use your deployed HTTPS URL.

**Next steps (Pico 4)**  
- [ ] Confirm IWSDK/vite-plugin-iwer supports a `"pico"` device for the simulator (optional).  
- [ ] Deploy build to a public HTTPS URL (e.g. Cloudflare).  
- [ ] On Pico 4: open URL in PICO Browser, test Enter XR, locomotion, and voice (STT/TTS).

---

## 3. Voice Pipeline: Sesame + STT

### 3.1 Clarifying “Sesame” in your doc

- **Sesame** in the wild usually refers to **Sesame CSM (Conversational Speech Model)** — a **text-to-speech** (and voice-to-voice) model, not speech-to-text ([Vogent](https://docs.vogent.ai/platform-overview/voices/sesame), [Vapi](https://vapi.ai/sesame), [DeepInfra](https://deepinfra.com/sesame/csm-1b)).
- So a clean split is:
  - **Speech-to-text (STT)**: User speech → text (for Brain input).
  - **Text-to-speech (TTS)**: Brain’s `voice_reflection` and `next_question` → audio (Sesame or ElevenLabs).

### 3.2 Recommended voice stack

| Step | Option A (no/minimal backend) | Option B (more control) |
|------|-------------------------------|---------------------------|
| **STT** | Browser [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) (free; works in Chrome/Edge and often in PICO Browser) | Backend calling Whisper or AssemblyAI |
| **Brain** | Your FastAPI `POST /infer` (always) | Same |
| **TTS** | **Sesame CSM** via [DeepInfra](https://deepinfra.com/sesame/csm-1b) or [Vapi](https://vapi.ai/sesame) (realistic, short lines) | **ElevenLabs** as in your doc |

- **Sesame (TTS)**  
  - DeepInfra: `POST` with text → audio (e.g. WAV/MP3). Pay per character; good for short reflection lines.  
  - Vapi: build a “voice agent” that can use Sesame; more setup but handles turn-taking if you want that later.  
- **Web Speech API (STT)**  
  - No API key; works in WebXR page. On Pico 4, test in PICO Browser; if unsupported, fall back to Option B (backend STT) or a simple “type your response” for the demo.

**Next steps (voice)**  
- [ ] Implement STT in the WebXR app (Web Speech API first; add backend STT if needed for Pico).  
- [ ] Choose TTS: Sesame (DeepInfra or Vapi) vs ElevenLabs; implement one client in the app (call from frontend or via a thin backend that returns audio URL or stream).  
- [ ] Wire: User speaks → STT → send text to Brain `POST /infer` → receive `voice_reflection` + `next_question` → TTS → play in headset; keep UI text minimal.

---

## 4. Brain API Contract (WebXR ↔ Python)

WebXR only needs to call one endpoint and drive the world from the response.

**Endpoint:** `POST /infer`  
**Request:**

```json
{ "response_text": "User spoken response" }
```

**Response:**

```json
{
  "states": {
    "reflection": 0.3,
    "defensiveness": 0.8,
    "curiosity": 0.2,
    "stress": 0.4
  },
  "dominant_state": "defensiveness",
  "voice_reflection": "Your response sounds more protective than exploratory.",
  "next_question": "What feels threatened if your version of events is incomplete?"
}
```

**WebXR uses:**  
- `dominant_state` → drive environment mapping (see below).  
- `voice_reflection` → send to TTS and play.  
- `next_question` → send to TTS and play (or play after reflection).

**Next steps (Brain)**  
- [ ] Paula: Implement FastAPI `POST /infer` with this contract; run local LLM (Phi-3 / Llama 3 / Mistral) and return JSON.  
- [ ] Enable CORS for the WebXR origin (and your deployed URL).  
- [ ] Expose Brain on a URL the WebXR app (and Pico 4) can reach (e.g. same LAN + ngrok, or a small cloud deployment).

---

## 5. Environment Mapping in WebXR

Canonical mapping and voice rules: **[STATE_ENVIRONMENT_MAPPING.md](STATE_ENVIRONMENT_MAPPING.md)**. Summary:

| `dominant_state` | World reaction |
|------------------|----------------|
| `reflection`     | Bridge opens / world expands |
| `defensiveness`  | Wall rises / bridge retracts |
| `stress`         | Fog increases / lighting darkens |
| `curiosity`      | Distant island lights up |

World structure: **floating island hub**, **2–3 bridges**, **distant islands**, **fog + lighting**.

### 5.1 How to implement in this repo

- **Rendering**: Keep using **Three.js + IWSDK**; you can keep or drop Gaussian splats for the “world” (e.g. one minimal splat as sky/ambient) and use **simple meshes** for bridges, walls, and islands so they’re easy to animate.
- **State-driven behavior**:
  - Add a **CognitiveState** (or **WorldState**) component that holds `dominant_state` and maybe raw `states`.
  - Add a **CognitiveWorldSystem** (or extend the main loop) that:
    - Reads `dominant_state`.
    - Drives parameters: bridge position/scale, wall height, fog density, ambient/directional light intensity, distant island emissive/visibility.
  - Transitions can be lerped over 1–2 seconds so changes feel smooth.

**Concrete pieces:**

1. **Bridges**  
   - 2–3 entities with `Object3D` (e.g. box or simple GLB).  
   - System moves/rotates or scales them: e.g. “retract” = translate toward hub or scale down; “open” = extend or scale up.

2. **Wall**  
   - One entity (plane or box); “wall rises” = translate Y or scale Y from 0 to height based on defensiveness.

3. **Fog**  
   - `world.scene.fog` (e.g. `THREE.FogExp2`); density and color driven by `stress` (and optionally `dominant_state === 'stress'`).

4. **Lighting**  
   - Ambient or directional intensity (and maybe color) driven by `stress` (darken) and `curiosity` (brighten distant island).

5. **Distant island**  
   - One or more meshes or simple objects; “lights up” = increase emissive or add a point light when `dominant_state === 'curiosity'`.

**Next steps (environment)**  
- [ ] Add minimal scene: one hub plane, 2–3 bridge objects, one wall, one “distant island” object, scene fog.  
- [ ] Add `CognitiveState` component and `CognitiveWorldSystem` that updates bridge/wall/fog/light/island from `dominant_state`.  
- [ ] Expose a way to set `dominant_state` from the Brain response (e.g. app state or message bus that the Brain client updates after `POST /infer`).

---

## 6. End-to-End Interaction Loop in WebXR

Target flow (2–3 turns):

1. **App loads** → Show minimal world; play or display initial question (e.g. “Think of a recent disagreement. What happened?”).
2. **User speaks** → STT (Web Speech or backend) → text.
3. **App** sends text to Brain `POST /infer` → gets `dominant_state`, `voice_reflection`, `next_question`.
4. **App** updates `CognitiveState` → **CognitiveWorldSystem** runs → environment changes (bridge, wall, fog, light, island).
5. **App** sends `voice_reflection` to TTS (Sesame or ElevenLabs) → plays audio in headset.
6. **App** sends `next_question` to TTS → plays question.
7. Repeat from step 2 (2–3 times total for MVP).

**Next steps (loop)**  
- [ ] Implement a small **ConversationManager** (or equivalent) in the WebXR app: STT start/stop, call Brain, update state, call TTS, queue/play audio.  
- [ ] Optional: simple “listening” indicator (e.g. panel or icon) so the user knows when to speak; keep text UI minimal.  
- [ ] Test full loop on desktop first, then on Pico 4 (PICO Browser).

---

## 7. Suggested Order of Work

| Phase | Owner | Tasks |
|-------|--------|--------|
| **1. Brain API** | Paula | FastAPI `POST /infer`, local LLM, JSON out; CORS; reachable URL. |
| **2. WebXR state + env** | Unity/WebXR | Minimal scene (hub, bridges, wall, island, fog); `CognitiveState` + `CognitiveWorldSystem`; drive from `dominant_state`. |
| **3. Voice** | Voice | STT in app (Web Speech API); TTS client (Sesame or ElevenLabs); play reflection + next question. |
| **4. Loop** | All | ConversationManager: STT → Brain → state update → env reaction → TTS; 2–3 turns. |
| **5. Pico 4** | All | Deploy HTTPS; test in PICO Browser; fix any device-specific bugs (e.g. Three.js, mic). |

You can parallelize 1 (Brain), 2 (env), and 3 (voice) once the contract is fixed; 4 and 5 build on them.

---

## 8. File / Module Checklist (this repo)

- [ ] **Brain client**  
  - `src/brainClient.ts` (or similar): `infer(responseText: string) => Promise<{ dominant_state, voice_reflection, next_question }>`; call `POST /infer`; base URL from env or config.
- [ ] **Voice**  
  - `src/voiceStt.ts`: Web Speech API wrapper (start/stop, return transcript).  
  - `src/voiceTts.ts`: Call Sesame (DeepInfra) or ElevenLabs; return audio URL or blob; play via `Audio` or `AudioContext`.
- [ ] **Cognitive world**  
  - `src/cognitiveWorld.ts`: Component `CognitiveState`; system `CognitiveWorldSystem`; create bridge/wall/island/fog/light entities in `index.ts` and control them from state.
- [ ] **Conversation flow**  
  - `src/conversationManager.ts`: Orchestrate: initial question → listen → STT → Brain → update state → TTS reflection → TTS next question → listen again (2–3 times).
- [ ] **Config**  
  - `src/config.ts` or `.env`: Brain API base URL; TTS API key (if needed); feature flags (use Web Speech vs backend STT).

---

## 9. References

- [SensAI WebXR World Models (this repo)](https://github.com/V4C38/sensai-webxr-worldmodels)  
- [PICO Developer – Web](https://developer.picoxr.com/blog/web/)  
- [Sesame / Vogent](https://docs.vogent.ai/platform-overview/voices/sesame), [Vapi + Sesame](https://vapi.ai/sesame), [DeepInfra CSM-1B](https://deepinfra.com/sesame/csm-1b)  
- [IWSDK (Elixr)](https://elixrjs.io/), [SparkJS](https://sparkjs.dev/)  
- [Web Speech API (STT)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)

---

*Document generated for Team Reflection — Inner World Model (Cognitive Reflection VR).*

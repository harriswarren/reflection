# Inner World Model — Technology Stack & Pipeline

**Canonical flow** for Team Reflection. All implementation should align with this pipeline.

---

## Pipeline (end-to-end)

```
User voice
    ↓
Sesame STT (speech-to-text)
    ↓
Brain API (Python service)
    ↓
dominant_state / score / next_question
    ↓
WebXR runtime → PICO
    ↓
animate environment
```

---

## Stage-by-stage

| Stage | Technology | Output / role |
|-------|------------|----------------|
| **1. User voice** | Microphone (in-headset on PICO) | Raw audio from user. |
| **2. Sesame STT** | Sesame speech-to-text | Transcript (text) of user’s response. |
| **3. Brain API** | Your Python service (`POST /infer`) | `dominant_state`, state scores, `voice_reflection`, `next_question`. |
| **4. WebXR runtime** | This repo (IWSDK + Three.js + SparkJS) | Runs in PICO Browser on Pico headset (or desktop for dev). |
| **5. Animate environment** | Cognitive world system + state mapping | Bridge, fog, island, lighting react to `dominant_state` and scores (see [STATE_ENVIRONMENT_MAPPING.md](STATE_ENVIRONMENT_MAPPING.md)). |

TTS (e.g. Sesame or ElevenLabs) for `voice_reflection` and `next_question` is part of the same WebXR runtime; the pipeline above focuses on the path from voice to environment animation.

---

## Where it lives in the repo

| Pipeline stage | Repo location |
|----------------|----------------|
| Sesame STT | WebXR app: `src/voiceStt.ts` (or Sesame STT API client if not browser-based). |
| Brain API | Separate Python service; prompts: `brain/prompts.py`. WebXR calls it via `src/brainClient.ts`. |
| dominant_state / score / next_question | Brain response; consumed by `src/conversationManager.ts` and `src/cognitiveWorld.ts`. |
| WebXR → PICO | Vite build; deploy HTTPS; open in PICO Browser on device. |
| Animate environment | `src/cognitiveWorld.ts` (`CognitiveState` + `CognitiveWorldSystem`); mapping: `docs/STATE_ENVIRONMENT_MAPPING.md`. |

---

## Contract (Brain API)

**Input:** `{ "response_text": "<transcript from Sesame STT>" }`

**Output:**  
`dominant_state`, state scores (`reflection`, `defensiveness`, `curiosity`, `stress`), `voice_reflection`, `next_question` (see [INNER_WORLD_MODEL_PLAN.md](INNER_WORLD_MODEL_PLAN.md) and `src/brainClient.ts`).

This doc is the single reference for the planned tech stack and pipeline.

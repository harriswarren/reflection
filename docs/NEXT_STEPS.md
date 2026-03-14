# Inner World Model — Next Steps Checklist

Quick reference. Full plan: [INNER_WORLD_MODEL_PLAN.md](./INNER_WORLD_MODEL_PLAN.md).

---

## Immediate (this week)

- [ ] **Brain API** (Paula): Implement `POST /infer` with exact JSON contract; run local LLM; expose URL + CORS.
- [ ] **Config**: Add `src/config.ts` (or `.env`) with `BRAIN_API_URL`; document TTS API keys if used.
- [ ] **Brain client**: Add `src/brainClient.ts` — `infer(responseText)` calling Brain; use in conversation flow.
- [ ] **Minimal cognitive world**: Add hub + 2–3 bridges + wall + distant island + fog in Three.js; add `CognitiveState` component and `CognitiveWorldSystem` that reacts to `dominant_state`.
- [ ] **STT**: Implement `src/voiceStt.ts` using Web Speech API (with fallback “type your response” for demo if needed).
- [ ] **TTS**: Implement `src/voiceTts.ts` — Sesame (DeepInfra) or ElevenLabs; play `voice_reflection` and `next_question` in headset.
- [ ] **Conversation manager**: Add `src/conversationManager.ts` — loop: initial question → listen → STT → Brain → update world state → TTS reflection → TTS next question; repeat 2–3 times.

---

## Pico 4

- [ ] Deploy WebXR app to HTTPS (e.g. Cloudflare `dist/`).
- [ ] On Pico 4: open URL in PICO Browser; test Enter XR, locomotion, and voice.
- [ ] If simulator supports Pico: set `device: "pico"` in `vite.config.ts` for dev; otherwise keep Meta for simulator and test on real Pico.

---

## Optional / stretch

- [ ] Pre-built LoD for splat (if you keep a splat environment) for faster load on Pico.
- [ ] EEG cognitive load integration.
- [ ] Deeper dialogue branching or persistent cognitive map.

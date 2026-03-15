# How the World Model Changes From Voice Input

The environment (bridge, wall, island, fog, light) is driven by a **signal** that comes from voice input via the Brain API. Here’s the path and how to use it.

---

## Signal path (voice → world change)

```
User speaks
    → Sesame STT (speech-to-text)
    → transcript
    → Brain API (POST /infer)
    → response: dominant_state, states.reflection|defensiveness|curiosity|stress, voice_reflection, next_question
    → onStateUpdate(result) in the WebXR app
    → setCognitiveState(result)  ← writes to cognitiveStateStore
    → CognitiveWorldSystem (runs every frame)
    → reads getCognitiveState()
    → lerps bridge / wall / island / fog / light toward targets
    → environment updates on screen
```

So: **voice → STT → Brain → onStateUpdate → store → system → scene**. The “world model” is the same Marble splat; what changes is the **reactive layer** (bridge, wall, island, fog, light) driven by `dominant_state` and scores.

---

## Where it’s implemented

| Step | Code |
|------|------|
| Brain response | `src/brainClient.ts` — `infer(transcript)` returns `dominant_state`, `states`, etc. |
| Write signal into app | `src/cognitiveStateStore.ts` — `setCognitiveState(result)` (call from `onStateUpdate`). |
| Read signal every frame | `src/cognitiveWorld.ts` — `CognitiveWorldSystem.execute()` calls `getCognitiveState()`. |
| Map state → scene | Same file: `dominant_state` + scores → target bridge scale, wall Y, island emissive, fog density, light intensity; then lerp. |
| Conversation flow | `src/conversationManager.ts` — `runConversation(initialQuestion, { onStateUpdate })`; pass `onStateUpdate: setCognitiveState`. |

---

## State → environment mapping (summary)

| dominant_state | What changes in the scene |
|----------------|----------------------------|
| **reflection** | Bridge opens (scale up), light brighter. |
| **defensiveness** | Bridge retracts (scale down), wall rises, fog up a bit, light dimmer. |
| **curiosity** | Distant island and light glow (emissive up). |
| **stress** | Fog density up, ambient light dimmer. |

Scores (0–1) scale how strong the effect is. See **docs/STATE_ENVIRONMENT_MAPPING.md** for the full mapping and voice rules.

---

## How to run the full loop

1. **Brain API** must be running and reachable (`VITE_BRAIN_API_URL` in `.env`).
2. In your world setup (e.g. in `src/index.ts` after the world is created), start the conversation and wire the signal:

```ts
import { runConversation } from "./conversationManager.js";
import { setCognitiveState } from "./cognitiveStateStore.js";

// When the user is ready (e.g. button click or after Enter XR):
runConversation("Think of a recent disagreement. What happened?", {
  onStateUpdate: setCognitiveState,  // ← this updates the store; CognitiveWorldSystem reacts
  onListening: () => { /* optional: show "Listening..." */ },
  onThinking: () => { /* optional: show "Thinking..." */ },
  onSpeaking: () => { /* optional: show "Speaking..." */ },
});
```

3. Each time the user speaks and the Brain returns, `onStateUpdate(result)` runs → `setCognitiveState(result)` → the store updates → on the next frame `CognitiveWorldSystem` reads the store and moves bridge/wall/island/fog/light toward the new targets. The world model (Marble splat) stays the same; only this reactive layer changes.

---

## Optional: test without voice

To see the environment react without the Brain or STT:

```ts
import { setCognitiveState } from "./cognitiveStateStore.js";

// Simulate a Brain response (e.g. defensiveness high):
setCognitiveState({
  states: { reflection: 0.2, defensiveness: 0.9, curiosity: 0.1, stress: 0.4 },
  dominant_state: "defensiveness",
  voice_reflection: "",
  next_question: "",
});
```

The bridge should retract, wall rise, and fog/light adjust within a second or two.

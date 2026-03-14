# State → Environment Mapping

Canonical mapping from cognitive state (from the Brain API) to world changes in the Inner World Model. Original source: `docs/plan.txt`. Used by the WebXR app’s cognitive world system and by the Brain’s voice reflections.

---

## 1. Reflection

| | |
|---|---|
| **Meaning** | User examines their own thinking. |
| **Environment effect** | The world opens forward. |
| **Visual changes** | Bridge unfolds, light softens, space expands, forward path appears. |
| **Voice reflection example** | “Reflection is opening space.” |

---

## 2. Defensiveness

| | |
|---|---|
| **Meaning** | User protects their position and resists alternative views. |
| **Environment effect** | The world becomes constrained. |
| **Visual changes** | Bridge retracts, walls rise, space narrows, movement options reduce. |
| **Voice reflection example** | “Certainty is narrowing the path.” |

---

## 3. Curiosity

| | |
|---|---|
| **Meaning** | User is exploring alternative interpretations. |
| **Environment effect** | New possibilities appear. |
| **Visual changes** | New island lights up, hidden path appears, particles guide attention outward. |
| **Voice reflection example** | “Curiosity is revealing new ground.” |

---

## 4. Stress

| | |
|---|---|
| **Meaning** | User feels threatened or emotionally tense. |
| **Environment effect** | The atmosphere changes. |
| **Visual changes** | Fog increases, light dims, ambient sound deepens. |
| **Voice reflection example** | “Tension is shaping the atmosphere.” |

---

## Dominant state

For simplicity, the environment responds only to the **dominant** cognitive state.

**Example state scores:**  
`reflection 0.3`, `defensiveness 0.8`, `curiosity 0.2`, `stress 0.4`  
→ **Dominant state = defensiveness**  
→ Environment: bridge retracts, space narrows.

---

## Unity / WebXR pseudo-logic

```text
if dominant_state == reflection:    open_forward_bridge()
if dominant_state == defensiveness: retract_bridge()
if dominant_state == curiosity:     reveal_hidden_island()
if dominant_state == stress:        increase_fog()
```

State **scores** control how strong the change is (e.g. reflection 0.3 → small light increase; 0.8 → full bridge expansion) for smoother transitions.

---

## Environmental persistence

The world does **not** reset after each question. It evolves.

**Example sequence:**  
User defensive → bridge closes → User reflective → bridge slowly opens → User curious → new island appears.  
The world becomes a history of thinking patterns.

---

## Voice + environment synchronization

Order of operations:

1. User response  
2. Short pause  
3. **Environment change animation**  
4. AI voice reflection  
5. Next question  

**Example:** Bridge retracts, then voice: “Your response sounds more protective than exploratory.”

---

## Avoid direct judgment

- **Never say:** “You are defensive.”
- **Instead say:** “The response sounds protective.” or “Certainty is narrowing the path.”

The environment communicates the rest; voice stays descriptive and non-judgmental.

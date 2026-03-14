# SensAI Hack: Worlds in Action — Scope & Category Decision

**Source:** [Worlds in Action Hack San Francisco](https://sensaihack.notion.site/Worlds-in-Action-Hack-San-Francisco-27dd7964cb7c80eebd4af085a55b7832) (Notion)  
**Event:** March 13–15, 2026 · Fort Mason, SF · $8,000 prize pool  
**Team:** Reflection

---

## Hackathon rules (all categories)

- **New projects only** – No coding before the event; mockups / fine-tuning world models beforehand are allowed.
- **Functionality** – Must run consistently on intended platform and match demo video and description.
- **Submissions** – Devpost (one submitter, tag collaborators), ~45 s demo video (on device, no copyrighted music), text description, build (APK / **WebXR link** / web app URL), list paid tools/SDKs/APIs, Google Drive folder named after team with build + video in root.
- **Discord** – [discord.gg/nwmpyyRBhm](https://discord.gg/nwmpyyRBhm) for questions.

---

## Category overview (and fit for Inner World Model)

| Category | Prize | Category-specific requirement | Fit for us |
|----------|--------|-------------------------------|------------|
| **Best World Models Implementation with PICO** | $1,500 + $500 Marble credits | At least one **world model pipeline running on or rendered through PICO hardware** | ✅ **Primary** – We use Marble (world model) + cognitive state → environment; rendered on Pico via WebXR. |
| **Best Filmmaking, Entertainment, Simulation App** | $1,000 + $500 Marble credits | At least one **world model–generated environment or scene** as core | ✅ **Secondary** – Marble scene + interactive narrative (reflective dialogue); immersive, story-driven. |
| **Best Gaming, UGC Experience** | $1,000 + $500 Marble credits | At least one **world model–driven interactive element** (environment, character, or mechanic) | ⚠️ Possible – User “shapes” world via dialogue; less natural than World Models / Filmmaking. |
| **Best WebSpatial Project with PICO** | $1,500 | **Must be web-based spatial app that runs on the PICO Emulator** | ❌ **No** – We target **real Pico headset + PICO Browser**, not the emulator. |
| **Best Agentic Mission Control with PICO** | $1,500 | **Must run on PICO Emulator**; multi-view/multitasking; spatial interface for **managing AI agents** | ❌ **No** – Emulator required; we’re single-user reflective VR, not a command center. |
| **Best Emulator Project with PICO** | $1,500 | **Must use PICO Emulator’s multi-view** for productivity/spatial workflow | ❌ **No** – We are not using the emulator. |

---

## Recommendation

### Primary category: **Best World Models Implementation with PICO**

- **Why:** Our project is a world model: we model **cognitive state** (reflection, defensiveness, curiosity, stress) and the **environment responds** (bridge, fog, island, lighting). We use a **world model pipeline** (Marble for the 3D scene + our state→environment simulation) **rendered through PICO** via WebXR in PICO Browser. The category is “open use-case” and explicitly calls out “adaptive real-time simulation” and “persistent AI-driven worlds.”
- **Requirement check:** “At least one world model pipeline running on or rendered through PICO hardware” → ✅ Marble splats + state-driven world, rendered on Pico headset.
- **Prize:** $1,500 + $500 Marble API credits.

### Secondary category: **Best Filmmaking, Entertainment, Simulation App**

- **Why:** We have a **world model–generated environment** (Marble) as a core part of the experience and an **interactive narrative** (reflective dialogue, AI voice, evolving world). The category rewards “interactive narrative experiences” and “AI-augmented entertainment.”
- **Requirement check:** “At least one world model–generated environment or scene as core” → ✅ Marble scene is core; dialogue and state drive the “story.”
- **Prize:** $1,000 + $500 Marble API credits.

### Do not target (without changing scope)

- **WebSpatial, Agentic, Emulator** – All require the **PICO Emulator**. We are building for the **real Pico headset + PICO Browser**; switching would mean extra scope (emulator setup, possibly different runtime). Stay on device for this hack.

---

## Scope recommendation

Keep current scope; no need to add the emulator or new categories.

| What | Recommendation |
|------|----------------|
| **Platform** | Pico headset + PICO Browser (WebXR). Demo video should show the experience **on the Pico device**. |
| **Build submission** | WebXR link (HTTPS URL to your deployed app, e.g. Cloudflare or ngrok). |
| **World model pipeline** | Clearly show **Marble** (splat scene) + **state-driven environment** (bridge/fog/island reacting to dominant_state). |
| **Narrative** | 2–3 reflective Q&A loops, voice in/out, environment changing each turn. |
| **Categories to submit** | Submit to **World Models** (primary) and **Filmmaking / Entertainment** (secondary) if the hack allows multiple category entries; otherwise choose **World Models** first. |

---

## Submission checklist (from Notion)

- [ ] All team members on Devpost, joined SensAI Hack; one submits and tags collaborators.
- [ ] ~45 s demo video: experience **on Pico device**, no copyrighted music or third-party trademarks.
- [ ] Text description: features, functionality, how it works.
- [ ] Build: **WebXR link** (public HTTPS URL).
- [ ] List all paid software, SDKs, APIs, design tools.
- [ ] Google Drive folder named after team (e.g. “Reflection”); build + demo video in root; other files in “Other” subfolder.

---

## Links (Notion)

- [Main hack page](https://sensaihack.notion.site/Worlds-in-Action-Hack-San-Francisco-27dd7964cb7c80eebd4af085a55b7832)
- [Best World Models Implementation with PICO](https://sensaihack.notion.site/Best-World-Models-Implementation-with-PICO-27dd7964cb7c81c2ab28cb3ab5e363ec)
- [Best Filmmaking, Entertainment, Simulation App](https://sensaihack.notion.site/Best-Filmmaking-Entertainment-Simulation-App-27dd7964cb7c814b8b60fe2fee69ac80)
- [Submission guideline (Devpost)](https://docs.google.com/document/d/1278emR8lVyzBiH6NRCxiYGL-n_oiB2hTgBGR81y5rFg/edit?usp=sharing)

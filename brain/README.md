# Brain service (inference)

Python module for the **Inner World Model** cognitive inference engine.

## Contents

- **`prompts.py`** – System prompt and `build_user_prompt()` for the LLM. Use these in your FastAPI `POST /infer` handler to build messages and parse JSON output (`states`, `dominant_state`, `voice_reflection`, `next_question`).
- **`worldlabs_client.py`** – World Labs (Marble) API client. Call `create_world`, `poll_until_done`, `get_asset_urls` to generate worlds server-side and return `splatUrl` / `meshUrl` to the WebXR app. Requires `requests` and `WORLDLABS_API_KEY` in the environment. See **docs/WORLDLABS_API_SETUP.md**.

## Contract (WebXR app expects)

The Brain API should return JSON compatible with `src/brainClient.ts`:

- `states`: `{ reflection, defensiveness, curiosity, stress }` (0–1)
- `dominant_state`: one of `"reflection"` | `"defensiveness"` | `"curiosity"` | `"stress"`
- `voice_reflection`: one short, non-judgmental sentence (see `docs/STATE_ENVIRONMENT_MAPPING.md`)
- `next_question`: follow-up question

Optional: `signals`, `reasoning_short` for logging or tuning.

## Running the Brain service

Add your FastAPI app in this folder (e.g. `main.py`) that:

1. Imports `SYSTEM_PROMPT` and `build_user_prompt` from `prompts`.
2. Accepts `POST /infer` with `{ "response_text": "..." }` (and optionally `previous_question`).
3. Calls your local LLM with the prompts and returns the JSON above. Enable CORS for the WebXR origin.

See `docs/INNER_WORLD_MODEL_PLAN.md` for the full architecture.

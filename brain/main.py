"""
Brain API — FastAPI server for Inner World Model cognitive inference.
Uses OpenAI GPT-4o-mini to analyze user speech and return cognitive state.

Run:  uvicorn brain.main:app --host 0.0.0.0 --port 8000 --reload
Requires: OPENAI_API_KEY in environment or .env file.
"""

import json
import os
from typing import Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai

from prompts import SYSTEM_PROMPT, build_user_prompt

# Load .env if python-dotenv is available
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

app = FastAPI(title="SensAI Brain", version="0.1.0")

# CORS: allow WebXR app from any origin (dev) or specific origin (prod)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# OpenAI client — uses OPENAI_API_KEY env var
client = openai.OpenAI(api_key=os.getenv("OPENAI_API_KEY", ""))


class InferRequest(BaseModel):
    response_text: str
    previous_question: Optional[str] = None


class StatesOut(BaseModel):
    reflection: float
    defensiveness: float
    curiosity: float
    stress: float


class InferResponse(BaseModel):
    states: StatesOut
    dominant_state: str
    voice_reflection: str
    next_question: str


@app.post("/infer", response_model=InferResponse)
async def infer(req: InferRequest):
    """
    Analyze user speech and return cognitive-emotional state.
    The LLM returns JSON with states (0-1), dominant_state,
    voice_reflection, and next_question.
    """
    if not req.response_text.strip():
        raise HTTPException(status_code=400, detail="response_text is empty")

    api_key = os.getenv("OPENAI_API_KEY", "")
    if not api_key:
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY not configured")

    user_prompt = build_user_prompt(req.response_text, req.previous_question)

    try:
        completion = client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=0.3,
            max_tokens=500,
            response_format={"type": "json_object"},
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
        )
    except openai.AuthenticationError:
        raise HTTPException(status_code=500, detail="Invalid OPENAI_API_KEY")
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"OpenAI API error: {e}")

    raw = completion.choices[0].message.content or "{}"

    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="LLM returned invalid JSON")

    # Extract states with defaults
    states_raw = data.get("states", {})
    states = StatesOut(
        reflection=float(states_raw.get("reflection", 0)),
        defensiveness=float(states_raw.get("defensiveness", 0)),
        curiosity=float(states_raw.get("curiosity", 0)),
        stress=float(states_raw.get("stress", 0)),
    )

    dominant = data.get("dominant_state", "reflection")
    valid_states = {"reflection", "defensiveness", "curiosity", "stress"}
    if dominant not in valid_states:
        dominant = "reflection"

    return InferResponse(
        states=states,
        dominant_state=dominant,
        voice_reflection=data.get("voice_reflection", ""),
        next_question=data.get("next_question", ""),
    )


@app.get("/health")
async def health():
    return {"status": "ok"}

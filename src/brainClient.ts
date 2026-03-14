/**
 * Brain API client for Inner World Model.
 * Calls POST /infer with the user's response text and returns cognitive state + reflection + next question.
 */

import { BRAIN_API_URL } from "./config.js";

/** Response from Brain POST /infer. */
export interface BrainInferResponse {
  states: {
    reflection: number;
    defensiveness: number;
    curiosity: number;
    stress: number;
  };
  dominant_state: "reflection" | "defensiveness" | "curiosity" | "stress";
  voice_reflection: string;
  next_question: string;
}

/**
 * Sends user response text to the Brain service and returns inference result.
 * CORS must be enabled on the Brain service for the WebXR origin.
 */
export async function infer(responseText: string): Promise<BrainInferResponse> {
  const res = await fetch(`${BRAIN_API_URL}/infer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ response_text: responseText }),
  });
  if (!res.ok) {
    throw new Error(`Brain API error: ${res.status} ${await res.text()}`);
  }
  return res.json() as Promise<BrainInferResponse>;
}

"""
World Labs (Marble) API client for the Brain backend.

Call from your FastAPI service to generate worlds server-side and return
splatUrl / meshUrl to the WebXR app so the API key never goes to the client.

Set env var: WORLDLABS_API_KEY (from platform.worldlabs.ai).
See docs/WORLDLABS_API_SETUP.md for setup.
"""

import os
import time
from typing import Any

import requests

BASE = "https://api.worldlabs.ai"


def _headers() -> dict[str, str]:
    key = os.environ.get("WORLDLABS_API_KEY")
    if not key:
        raise ValueError("WORLDLABS_API_KEY environment variable is not set")
    return {
        "Content-Type": "application/json",
        "WLT-Api-Key": key,
    }


def create_world(
    display_name: str,
    text_prompt: str,
    model: str | None = None,
) -> dict[str, Any]:
    """
    POST /marble/v1/worlds:generate.
    Returns {"operation_id": "..."}. Poll with poll_until_done.
    """
    body: dict[str, Any] = {
        "display_name": display_name,
        "world_prompt": {
            "type": "text",
            "text_prompt": text_prompt,
        },
    }
    if model:
        body["model"] = model

    r = requests.post(
        f"{BASE}/marble/v1/worlds:generate",
        headers=_headers(),
        json=body,
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def poll_until_done(
    operation_id: str,
    poll_interval_sec: float = 5.0,
    max_wait_sec: float = 600.0,
) -> dict[str, Any]:
    """
    GET /marble/v1/operations/{id} until done.
    Returns the world snapshot (with response.assets.splats, response.assets.mesh).
    """
    url = f"{BASE}/marble/v1/operations/{operation_id}"
    start = time.monotonic()
    while (time.monotonic() - start) < max_wait_sec:
        r = requests.get(url, headers=_headers(), timeout=30)
        r.raise_for_status()
        data = r.json()
        if data.get("error"):
            raise RuntimeError(f"Marble operation failed: {data['error']}")
        if data.get("done") and data.get("response"):
            return data["response"]
        time.sleep(poll_interval_sec)
    raise TimeoutError("Marble operation timed out")


def get_asset_urls(snapshot: dict[str, Any]) -> tuple[str, str]:
    """
    From a completed world snapshot, return (splat_url, mesh_url).
    Prefers 500k splat for VR; mesh_url may be empty.
    """
    assets = snapshot.get("assets") or {}
    spz = (assets.get("splats") or {}).get("spz_urls") or {}
    splat_url = (
        spz.get("500k") or spz.get("100k") or spz.get("full_res") or ""
    )
    mesh_url = (assets.get("mesh") or {}).get("collider_mesh_url") or ""
    if not splat_url:
        raise ValueError("World snapshot has no splat URLs")
    return splat_url, mesh_url

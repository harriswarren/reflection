"""
Test World Labs (Marble) API connection.

If your .env has VITE_WORLDLABS_API_KEY, the script will use it automatically.

From project root:
  python brain/test_worldlabs.py

Or from brain/ folder (set key if not in .env):
  cd brain
  set WORLDLABS_API_KEY=wl_your_key
  python test_worldlabs.py
"""
import os
import sys

# Optional: load .env from project root so WORLDLABS_API_KEY can come from .env
def _load_dotenv():
    root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(root, ".env")
    if os.path.isfile(env_path):
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    k, v = line.split("=", 1)
                    k = k.strip()
                    v = v.strip().strip('"').strip("'")
                    # Support both VITE_WORLDLABS_API_KEY and WORLDLABS_API_KEY
                    if k == "VITE_WORLDLABS_API_KEY" and "WORLDLABS_API_KEY" not in os.environ:
                        os.environ.setdefault("WORLDLABS_API_KEY", v)
                    elif k == "WORLDLABS_API_KEY":
                        os.environ.setdefault("WORLDLABS_API_KEY", v)


_load_dotenv()

from worldlabs_client import create_world, poll_until_done, get_asset_urls


def main():
    key = os.environ.get("WORLDLABS_API_KEY")
    if not key:
        print("ERROR: WORLDLABS_API_KEY not set.")
        print("Set it to your World Labs API key (same as VITE_WORLDLABS_API_KEY in .env).")
        print("Example: set WORLDLABS_API_KEY=wl_your_key_here")
        sys.exit(1)

    print("Testing World Labs API connection...")
    print("1. Starting world generation (Marble 0.1-mini, fast draft)...")

    try:
        op = create_world(
            display_name="Connection Test",
            text_prompt="A small empty room with a single window",
            model="Marble 0.1-mini",
        )
        operation_id = op.get("operation_id")
        if not operation_id:
            print("   Unexpected response:", op)
            sys.exit(1)
        print(f"   OK — operation_id: {operation_id}")
    except Exception as e:
        print(f"   FAILED: {e}")
        sys.exit(1)

    print("2. Polling until complete (may take ~30–45 s for mini)...")
    try:
        snapshot = poll_until_done(operation_id, poll_interval_sec=5, max_wait_sec=120)
        splat_url, mesh_url = get_asset_urls(snapshot)
        print("   OK — world ready.")
        print(f"   splatUrl: {splat_url[:60]}...")
        print(f"   meshUrl:  {mesh_url or '(none)'}")
    except Exception as e:
        print(f"   FAILED: {e}")
        sys.exit(1)

    print("\nWorld Labs connection test passed.")


if __name__ == "__main__":
    main()

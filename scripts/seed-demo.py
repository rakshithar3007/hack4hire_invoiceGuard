#!/usr/bin/env python3
"""
InvoiceGuard Demo Seeding & Reset Utility
Usage:
    python scripts/seed-demo.py [--url http://localhost:8000] [--reset]
"""

import sys
import argparse
import json
import urllib.request
import urllib.error

def main():
    parser = argparse.ArgumentParser(description="InvoiceGuard Demo Reset & Seed Tool")
    parser.add_argument("--url", default="http://localhost:8000", help="Base backend URL (default: http://localhost:8000)")
    parser.add_argument("--reset", action="store_true", help="Reset all demo records back to clean baseline state")
    args = parser.parse_args()

    base_url = args.url.rstrip("/")
    target_endpoint = f"{base_url}/api/demo/reset" if args.reset else f"{base_url}/api/demo/seed"
    
    print(f"[InvoiceGuard] Contacting {target_endpoint}...")

    req = urllib.request.Request(
        target_endpoint,
        data=b"{}",
        headers={"Content-Type": "application/json"},
        method="POST"
    )

    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            print(f"[SUCCESS] Server responded: {json.dumps(data, indent=2)}")
    except urllib.error.URLError as e:
        print(f"[ERROR] Could not reach backend at {target_endpoint}: {e}", file=sys.stderr)
        print("Note: If the backend is on Render Free, it may be waking up (25-45s cold start).", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()

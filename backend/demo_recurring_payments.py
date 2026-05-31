from __future__ import annotations

import json

from backend.services.recurring_payments import run_detection_cycle


if __name__ == "__main__":
    output = run_detection_cycle()
    print(json.dumps(output, indent=2))
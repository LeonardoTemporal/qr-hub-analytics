from __future__ import annotations

import json
from pathlib import Path

MINIMUM_COVERAGE = {
    "app/domains/admin/router.py": 45.0,
    "app/domains/admin/security.py": 80.0,
    "app/domains/tracking/router.py": 70.0,
    "app/domains/workshop/router.py": 18.0,
    "app/routers/garage.py": 45.0,
    "app/routers/redirect.py": 80.0,
    "app/services/geo_service.py": 80.0,
    "app/worker.py": 15.0,
}


def main() -> int:
    report = json.loads(Path("coverage.json").read_text(encoding="utf-8"))
    files = {name.replace("\\", "/"): value for name, value in report["files"].items()}
    failures: list[str] = []

    for filename, minimum in MINIMUM_COVERAGE.items():
        actual = float(files.get(filename, {}).get("summary", {}).get("percent_covered", 0))
        if actual < minimum:
            failures.append(f"{filename}: {actual:.2f}% < {minimum:.2f}%")

    if failures:
        print("Critical module coverage regressed:")
        print("\n".join(f"- {failure}" for failure in failures))
        return 1

    print("Critical module coverage thresholds passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

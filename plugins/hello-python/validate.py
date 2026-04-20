import json
import sys


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    source_name = str(payload.get("workspaceConfig", {}).get("sourceName", "")).strip()
    errors = []

    if not source_name:
        errors.append({"field": "sourceName", "message": "sourceName is required"})

    sys.stdout.write(json.dumps({"valid": len(errors) == 0, "errors": errors}))


if __name__ == "__main__":
    main()

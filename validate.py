import json
import sys


def validate_workspace_config(workspace_config: dict[str, object]) -> list[dict[str, str]]:
    errors = []

    source_name = str(workspace_config.get("sourceName", "")).strip()
    message = str(workspace_config.get("message", "")).strip()

    if not source_name:
        errors.append({"field": "sourceName", "message": "sourceName is required"})
    if not message:
        errors.append({"field": "message", "message": "message is required"})

    return errors


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    workspace_config = payload.get("workspaceConfig", {}) or {}
    errors = validate_workspace_config(workspace_config)
    sys.stdout.write(json.dumps({"valid": len(errors) == 0, "errors": errors}))


if __name__ == "__main__":
    main()

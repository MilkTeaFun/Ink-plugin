import json
import re
import sys
from datetime import datetime, timezone


def slugify(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"[^a-z0-9]+", "-", value)
    value = value.strip("-")
    return value or "plugin"


def build_template_item(
    workspace_config: dict[str, object],
    secrets: dict[str, object],
    cursor: object,
    trigger: dict[str, object],
) -> tuple[dict[str, object], str]:
    # Replace this function with your real upstream fetch logic.
    source_name = str(workspace_config.get("sourceName", "My Plugin Source")).strip()
    message = str(
        workspace_config.get("message", "Replace fetch.py with your real collection logic.")
    ).strip()
    uppercase = bool(workspace_config.get("uppercase", False))

    triggered_at = str(
        trigger.get("triggeredAt") or datetime.now(timezone.utc).replace(microsecond=0).isoformat()
    )
    next_cursor = triggered_at

    body_lines = [message.upper() if uppercase else message]
    if cursor:
        body_lines.append(f"Previous cursor: {cursor}")
    if secrets.get("apiToken"):
        body_lines.append("API token configured.")

    item = {
        "externalId": f"{slugify(source_name)}-{triggered_at}",
        "title": f"{source_name} Digest",
        "sourceLabel": source_name,
        "blocks": [
            {"type": "heading", "level": 1, "text": f"{source_name} Digest"},
            {"type": "paragraph", "text": "\n".join(body_lines)},
        ],
    }
    return item, next_cursor


def main() -> None:
    payload = json.loads(sys.stdin.read() or "{}")
    workspace_config = payload.get("workspaceConfig", {}) or {}
    secrets = payload.get("secrets", {}) or {}
    cursor = payload.get("cursor")
    trigger = payload.get("trigger", {}) or {}

    item, next_cursor = build_template_item(workspace_config, secrets, cursor, trigger)
    sys.stdout.write(json.dumps({"items": [item], "cursor": next_cursor}))


if __name__ == "__main__":
    main()

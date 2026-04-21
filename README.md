# Ink Python Plugin Template

This repository is a single Ink source plugin template.

The recommended workflow is simple:

1. fork this repository,
2. edit the files in the repository root,
3. push to your fork,
4. install it in Ink from the Git repository URL.

You do not need `repoSubdir` for the default path because the repository root is the plugin root.

Ink itself lives at [MilkTeaFun/Ink](https://github.com/MilkTeaFun/Ink), and the current plugin contract is documented in [`docs/PLUGIN_SPEC.md`](https://github.com/MilkTeaFun/Ink/blob/main/docs/PLUGIN_SPEC.md).

## Why this template defaults to Python

Python is the better default for a fork-and-modify plugin template:

- many data-source plugins are small HTTP, scraping, or transformation scripts
- contributors can stay in one file while iterating on fetch logic
- standard library support is enough for many integrations
- people who are not primarily frontend or Node developers can still contribute quickly

If your team prefers Node, Ink still supports it. You can switch `runtime.type` to `node`, replace the entrypoints, and add `package.json` plus `pnpm-lock.yaml`.

## Files You Will Usually Edit

- `ink-plugin.json`: plugin metadata, fetch cadence, settings fields, and entrypoints
- `validate.py`: validates binding config saved in Ink Settings
- `fetch.py`: collects items and returns them to Ink
- `pyproject.toml`: Python dependencies
- `uv.lock`: locked Python environment for reproducible installs

## Hook Points

This template is meant to be changed in three places:

1. Rename the plugin in `ink-plugin.json`.
2. Replace the validation rules in `validate.py`.
3. Replace the sample fetch logic in `fetch.py` with your real upstream API or scraping logic.

Ink v2 behavior to keep in mind:

- `schemaVersion` must be `2`
- fetch cadence is owned by `fetchPolicy`
- print schedules do not pass plugin-defined schedule config
- `fetch` receives `workspaceConfig`, `secrets`, `cursor`, and `trigger`

## Quick Start

1. Fork this repository.
2. Update `ink-plugin.json`:
   - `pluginKey`
   - `name`
   - `description`
   - `fetchPolicy`
   - `workspaceConfigSchema`
3. Update `validate.py` to enforce your required config.
4. Update `fetch.py` to collect real items from your source.
5. If you need third-party Python packages, add them to `pyproject.toml` and refresh `uv.lock`.
6. Run:

   ```bash
   npm install
   npm run lint
   ```

7. Push to your fork.
8. In Ink admin settings, install from Git with:
   - repository URL: `https://github.com/<your-user>/<your-repo>.git`
   - ref: optional
   - plugin subdirectory: leave empty

## `validate.py` Contract

Ink writes JSON to stdin in this shape:

```json
{
  "workspaceConfig": {},
  "secrets": {}
}
```

Your script must print:

```json
{
  "valid": true,
  "errors": []
}
```

## `fetch.py` Contract

Ink writes JSON to stdin in this shape:

```json
{
  "workspaceConfig": {},
  "secrets": {},
  "cursor": "opaque-cursor",
  "trigger": {
    "kind": "automatic",
    "scheduledFor": "2026-04-20T12:00:00Z",
    "triggeredAt": "2026-04-20T12:00:03Z",
    "timezone": "UTC"
  }
}
```

Your script must print:

```json
{
  "items": [],
  "cursor": "next-cursor"
}
```

`items` are deduplicated by Ink on `(plugin_binding_id, external_id)`, so `externalId` should be stable for the upstream item you fetched.

## Editor Support

Point your editor at the schema to get completion and validation for `ink-plugin.json`. Example for VS Code:

```jsonc
{
  "json.schemas": [
    {
      "fileMatch": ["ink-plugin.json"],
      "url": "https://raw.githubusercontent.com/MilkTeaFun/Ink-plugin/main/schemas/ink-plugin.schema.json"
    }
  ]
}
```

## CI In Your Fork

Copy the workflow template into `.github/workflows/`:

```bash
mkdir -p .github/workflows
cp ci/workflow-template/lint.yml .github/workflows/lint.yml
git add .github/workflows/lint.yml
git commit -m "ci: enable plugin lint workflow"
```

## License

MIT — see [LICENSE](LICENSE).

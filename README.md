# Ink-plugin

This repository is the home for plugins that extend
[MilkTeaFun/Ink](https://github.com/MilkTeaFun/Ink) — the open-source management
workspace for Memobird thermal printers.

An Ink plugin is a small program that fetches data from an external source
(RSS, Weibo, Twitter, a webhook bridge, …) and hands a normalized list of
printable items back to the Ink runtime. Ink owns scheduling, deduplication,
rate limiting, retry, and printing — plugins only do data collection.

## Repository layout

```
plugins/                 # one directory per plugin
  hello-node/            # Node reference plugin
  hello-python/          # Python reference plugin
schemas/
  ink-plugin.schema.json # JSON Schema for ink-plugin.json
scripts/
  lint-plugins.mjs       # offline manifest + layout lint
ci/workflow-template/
  lint.yml               # GitHub Actions workflow; copy to .github/workflows/lint.yml
```

Each plugin is fully self-contained in its own directory. Nothing in `plugins/`
is imported by another directory.

## Writing a plugin

The authoritative contract is in
[`docs/PLUGIN_SPEC.md`](https://github.com/MilkTeaFun/Ink/blob/main/docs/PLUGIN_SPEC.md)
on the main Ink repo. The short version:

1. Create a directory under `plugins/<your-plugin>/`.
2. Add an `ink-plugin.json` manifest that matches
   [`schemas/ink-plugin.schema.json`](schemas/ink-plugin.schema.json).
3. Implement two entrypoints that read JSON from stdin and write JSON to stdout:
   - `validate` — returns `{ valid, errors[] }` for a given config.
   - `fetch` — returns `{ items[], cursor? }` on every trigger.
4. Supply the runtime-specific dependency files:
   - Node: `package.json` + `pnpm-lock.yaml`
   - Python: `pyproject.toml` + `uv.lock`
5. Run `npm run lint` locally before opening a PR.

Copy `plugins/hello-node/` or `plugins/hello-python/` as a starting point.

## Editor support

Point your editor at the schema to get completion and inline validation while
editing `ink-plugin.json`. For example, in VS Code:

```jsonc
// .vscode/settings.json
{
  "json.schemas": [
    {
      "fileMatch": ["ink-plugin.json"],
      "url": "https://raw.githubusercontent.com/MilkTeaFun/Ink-plugin/main/schemas/ink-plugin.schema.json"
    }
  ]
}
```

## Linting locally

```bash
npm install
npm run lint
```

The lint script:

- validates each `plugins/<name>/ink-plugin.json` against the JSON Schema,
- rejects duplicate `pluginKey` values across the repo,
- checks that the runtime-specific dependency files exist,
- checks that the files referenced by each entrypoint exist.

## Enabling CI

A ready-made GitHub Actions workflow lives at
[`ci/workflow-template/lint.yml`](ci/workflow-template/lint.yml). It runs
`npm run lint` on every push and pull request.

To activate it, copy the file into `.github/workflows/`:

```bash
mkdir -p .github/workflows
cp ci/workflow-template/lint.yml .github/workflows/lint.yml
git add .github/workflows/lint.yml
git commit -m "ci: enable plugin lint workflow"
```

The template lives outside `.github/` so the file can be committed by OAuth
integrations that were not granted the `workflow` scope; the one-time copy
above only needs to be done once per fork.

## Installing a plugin into Ink

Ink currently supports installing plugins via ZIP upload (admin panel). Git
URL installation is being added upstream — once shipped, forking this repo
and pointing an Ink instance at your fork will be enough to install your
plugins.

## License

MIT — see [LICENSE](LICENSE).

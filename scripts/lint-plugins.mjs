#!/usr/bin/env node
/**
 * Lints every plugin under plugins/<name>/ ink-plugin.json against
 * schemas/ink-plugin.schema.json, and checks that the directory layout
 * matches the runtime declared in the manifest.
 *
 * Exits non-zero if any plugin fails. Designed to be run in CI.
 */

import { readFile, readdir, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const pluginsDir = path.join(repoRoot, "plugins");
const schemaPath = path.join(repoRoot, "schemas", "ink-plugin.schema.json");

async function fileExists(filepath) {
  try {
    const info = await stat(filepath);
    return info.isFile();
  } catch {
    return false;
  }
}

async function main() {
  const schemaRaw = await readFile(schemaPath, "utf8");
  const schema = JSON.parse(schemaRaw);

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  let entries = [];
  try {
    entries = await readdir(pluginsDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") {
      console.log("plugins/ directory does not exist yet; nothing to lint.");
      return;
    }
    throw err;
  }

  const pluginDirs = entries.filter((e) => e.isDirectory()).map((e) => e.name).sort();
  if (pluginDirs.length === 0) {
    console.log("plugins/ is empty; nothing to lint.");
    return;
  }

  let failures = 0;
  const seenKeys = new Map();

  for (const name of pluginDirs) {
    const pluginDir = path.join(pluginsDir, name);
    const manifestPath = path.join(pluginDir, "ink-plugin.json");
    console.log(`\n→ ${name}`);

    if (!(await fileExists(manifestPath))) {
      console.error(`  ✗ missing ink-plugin.json`);
      failures += 1;
      continue;
    }

    let manifest;
    try {
      manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    } catch (err) {
      console.error(`  ✗ ink-plugin.json is not valid JSON: ${err.message}`);
      failures += 1;
      continue;
    }

    if (!validate(manifest)) {
      console.error(`  ✗ schema violations:`);
      for (const error of validate.errors ?? []) {
        const at = error.instancePath || "/";
        console.error(`    - ${at} ${error.message}`);
      }
      failures += 1;
      continue;
    }

    const previous = seenKeys.get(manifest.pluginKey);
    if (previous) {
      console.error(`  ✗ pluginKey "${manifest.pluginKey}" also used by ${previous}`);
      failures += 1;
      continue;
    }
    seenKeys.set(manifest.pluginKey, name);

    if (manifest.runtime.type === "node") {
      const missing = [];
      if (!(await fileExists(path.join(pluginDir, "package.json")))) missing.push("package.json");
      if (!(await fileExists(path.join(pluginDir, "pnpm-lock.yaml")))) missing.push("pnpm-lock.yaml");
      if (missing.length) {
        console.error(`  ✗ node plugin is missing: ${missing.join(", ")}`);
        failures += 1;
        continue;
      }
    } else if (manifest.runtime.type === "python") {
      const missing = [];
      if (!(await fileExists(path.join(pluginDir, "pyproject.toml")))) missing.push("pyproject.toml");
      if (!(await fileExists(path.join(pluginDir, "uv.lock")))) missing.push("uv.lock");
      if (missing.length) {
        console.error(`  ✗ python plugin is missing: ${missing.join(", ")}`);
        failures += 1;
        continue;
      }
    }

    const entrypointFiles = [
      manifest.entrypoints.validate.command,
      manifest.entrypoints.fetch.command,
    ];
    for (const command of entrypointFiles) {
      for (const arg of command.slice(1)) {
        if (!arg.includes(path.sep) && !arg.includes("/") && !arg.endsWith(".mjs") && !arg.endsWith(".js") && !arg.endsWith(".py")) {
          continue;
        }
        if (!(await fileExists(path.join(pluginDir, arg)))) {
          console.error(`  ✗ entrypoint file not found: ${arg}`);
          failures += 1;
        }
      }
    }

    console.log(`  ✓ ${manifest.pluginKey}@${manifest.version} (${manifest.runtime.type})`);
  }

  if (failures > 0) {
    console.error(`\n${failures} plugin(s) failed lint.`);
    process.exit(1);
  }
  console.log(`\nAll ${pluginDirs.length} plugin(s) passed lint.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

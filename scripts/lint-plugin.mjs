#!/usr/bin/env node
/**
 * Lints the single plugin rooted at this repository.
 *
 * Exits non-zero if the manifest or repository layout is invalid.
 */

import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..");
const schemaPath = path.join(repoRoot, "schemas", "ink-plugin.schema.json");
const manifestPath = path.join(repoRoot, "ink-plugin.json");

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

  if (!(await fileExists(manifestPath))) {
    console.error("✗ missing ink-plugin.json in repository root");
    process.exit(1);
  }

  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch (err) {
    console.error(`✗ ink-plugin.json is not valid JSON: ${err.message}`);
    process.exit(1);
  }

  let failures = 0;

  if (!validate(manifest)) {
    console.error("✗ schema violations:");
    for (const error of validate.errors ?? []) {
      const at = error.instancePath || "/";
      console.error(`  - ${at} ${error.message}`);
    }
    failures += 1;
  }

  if (manifest.runtime.type === "node") {
    const missing = [];
    if (!(await fileExists(path.join(repoRoot, "package.json")))) missing.push("package.json");
    if (!(await fileExists(path.join(repoRoot, "pnpm-lock.yaml")))) missing.push("pnpm-lock.yaml");
    if (missing.length) {
      console.error(`✗ node plugin is missing: ${missing.join(", ")}`);
      failures += 1;
    }
  } else if (manifest.runtime.type === "python") {
    const missing = [];
    if (!(await fileExists(path.join(repoRoot, "pyproject.toml")))) missing.push("pyproject.toml");
    if (!(await fileExists(path.join(repoRoot, "uv.lock")))) missing.push("uv.lock");
    if (missing.length) {
      console.error(`✗ python plugin is missing: ${missing.join(", ")}`);
      failures += 1;
    }
  }

  const entrypointFiles = [
    manifest.entrypoints.validate.command,
    manifest.entrypoints.fetch.command,
  ];
  for (const command of entrypointFiles) {
    for (const arg of command.slice(1)) {
      if (
        !arg.includes(path.sep) &&
        !arg.includes("/") &&
        !arg.endsWith(".mjs") &&
        !arg.endsWith(".js") &&
        !arg.endsWith(".py")
      ) {
        continue;
      }
      if (!(await fileExists(path.join(repoRoot, arg)))) {
        console.error(`✗ entrypoint file not found: ${arg}`);
        failures += 1;
      }
    }
  }

  if (failures > 0) {
    console.error(`\n${failures} check(s) failed.`);
    process.exit(1);
  }
  console.log(`✓ ${manifest.pluginKey}@${manifest.version} (${manifest.runtime.type})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

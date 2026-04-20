import process from "node:process";

async function readJSON() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  return raw ? JSON.parse(raw) : {};
}

const payload = await readJSON();
const errors = [];

if (!String(payload.workspaceConfig?.sourceName ?? "").trim()) {
  errors.push({
    field: "sourceName",
    message: "sourceName is required",
  });
}

process.stdout.write(
  JSON.stringify({
    valid: errors.length === 0,
    errors,
  }),
);

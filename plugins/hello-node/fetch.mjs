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
const sourceName = String(payload.workspaceConfig?.sourceName ?? "Node Hello Source").trim();
const message = String(
  payload.scheduleConfig?.message ?? "Hello from the Node fixture plugin.",
).trim();
const tone = String(payload.scheduleConfig?.tone ?? "plain").trim();
const repeatValue = Number.parseInt(String(payload.scheduleConfig?.repeat ?? "1"), 10);
const repeat = Number.isFinite(repeatValue) && repeatValue > 0 ? repeatValue : 1;
const includeTriggeredAt = Boolean(payload.workspaceConfig?.includeTriggeredAt);

const paragraphs = Array.from({ length: repeat }, () => ({
  type: "paragraph",
  text: message,
}));
if (tone === "verbose" && includeTriggeredAt && payload.trigger?.triggeredAt) {
  paragraphs.push({
    type: "paragraph",
    text: `Triggered at: ${payload.trigger.triggeredAt}`,
  });
}

const item = {
  externalId: `node-hello-${payload.trigger?.triggeredAt ?? "default"}`,
  title: `${sourceName} Digest`,
  sourceLabel: sourceName,
  blocks: [
    { type: "heading", level: 1, text: `${sourceName} Digest` },
    ...paragraphs,
  ],
};

process.stdout.write(
  JSON.stringify({
    items: [item],
    cursor: payload.trigger?.triggeredAt ?? null,
  }),
);

"use strict";

const { CodexAppServerClient } = require("../src/codexAppServerClient");

async function main() {
  const client = new CodexAppServerClient("codex", "0.1.0-smoke", () => {});
  try {
    const sessions = await client.listSessions({
      params: {
        archived: false,
        sortKey: "updated_at",
        sortDirection: "desc",
        sourceKinds: ["cli", "vscode"],
        cwd: process.cwd(),
      },
      maxResults: 10,
    });
    process.stdout.write(`${JSON.stringify({ count: sessions.length, cwd: process.cwd() })}\n`);
    if (sessions.length === 0) {
      process.exitCode = 1;
    }
  } finally {
    client.dispose();
  }
}

void main().catch((error) => {
  process.stderr.write(`${error instanceof Error ? error.stack : String(error)}\n`);
  process.exitCode = 1;
});

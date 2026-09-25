"use strict";

const vscode = require("vscode");
const { renderSessionMarkdown } = require("./sessionModel");

const scheme = "codex-session";

class SessionDetailsProvider {
  constructor() {
    this.sessions = new Map();
  }

  provideTextDocumentContent(uri) {
    const sessionId = decodeURIComponent(uri.path.replace(/^\//, "").replace(/\.md$/, ""));
    const session = this.sessions.get(sessionId);
    return session ? renderSessionMarkdown(session) : "# Sessão não encontrada\n";
  }

  register(context) {
    context.subscriptions.push(vscode.workspace.registerTextDocumentContentProvider(scheme, this));
  }

  async show(session) {
    this.sessions.set(session.id, session);
    const uri = vscode.Uri.parse(`${scheme}:/${encodeURIComponent(session.id)}.md`);
    try {
      await vscode.commands.executeCommand("markdown.showPreviewToSide", uri);
    } catch {
      const document = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(document, {
        preview: true,
        viewColumn: vscode.ViewColumn.Beside,
      });
    }
  }
}

module.exports = { SessionDetailsProvider };

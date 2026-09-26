"use strict";

const { spawn } = require("node:child_process");
const { EventEmitter } = require("node:events");
const readline = require("node:readline");

const sessionChangingNotifications = new Set([
  "thread/started",
  "thread/name/updated",
  "thread/status/changed",
  "thread/archived",
  "thread/unarchived",
  "thread/deleted",
  "turn/completed",
]);

class CodexAppServerClient {
  constructor(codexPath, clientVersion, log) {
    this.codexPath = codexPath;
    this.clientVersion = clientVersion;
    this.log = log;
    this.events = new EventEmitter();
    this.pendingRequests = new Map();
    this.process = undefined;
    this.outputReader = undefined;
    this.startPromise = undefined;
    this.nextRequestId = 1;
    this.disposed = false;
  }

  onDidChangeSessions(listener) {
    this.events.on("sessionsChanged", listener);
    return {
      dispose: () => this.events.off("sessionsChanged", listener),
    };
  }

  async listSessions(options) {
    await this.ensureStarted();

    const sessions = [];
    const seenCursors = new Set();
    let cursor = null;

    do {
      const response = await this.request("thread/list", {
        ...options.params,
        cursor,
        limit: 100,
      });

      for (const session of response.data) {
        if (!options.matches || options.matches(session)) {
          sessions.push(session);
        }
        if (sessions.length >= options.maxResults) {
          return sessions;
        }
      }

      cursor = response.nextCursor;
      if (cursor) {
        if (seenCursors.has(cursor)) {
          throw new Error("O app-server retornou um cursor de paginação repetido.");
        }
        seenCursors.add(cursor);
      }
    } while (cursor);

    return sessions;
  }

  dispose() {
    this.disposed = true;
    this.outputReader?.close();
    this.outputReader = undefined;
    this.rejectPendingRequests(new Error("Cliente do Codex app-server encerrado."));
    this.process?.kill();
    this.process = undefined;
    this.startPromise = undefined;
    this.events.removeAllListeners();
  }

  async ensureStarted() {
    if (this.disposed) {
      throw new Error("O cliente do Codex app-server já foi encerrado.");
    }
    if (!this.startPromise) {
      this.startPromise = this.start().catch((error) => {
        this.startPromise = undefined;
        throw error;
      });
    }
    await this.startPromise;
  }

  async start() {
    this.log(`Iniciando: ${this.codexPath} app-server --stdio`);
    const child = spawn(this.codexPath, ["app-server", "--stdio"], {
      stdio: ["pipe", "pipe", "pipe"],
      env: process.env,
      windowsHide: true,
    });
    this.process = child;

    child.stderr.on("data", (data) => {
      const message = data.toString("utf8").trim();
      if (message) {
        this.log(`[app-server] ${message}`);
      }
    });

    child.once("error", (error) => {
      this.handleProcessFailure(error);
    });

    child.once("exit", (code, signal) => {
      if (!this.disposed) {
        this.handleProcessFailure(
          new Error(`Codex app-server encerrado (código ${code ?? "-"}, sinal ${signal ?? "-"}).`),
        );
      }
    });

    this.outputReader = readline.createInterface({ input: child.stdout });
    this.outputReader.on("line", (line) => this.handleLine(line));

    await this.requestInternal("initialize", {
      clientInfo: {
        name: "codex_project_sessions",
        title: "Codex Project Sessions",
        version: this.clientVersion,
      },
      capabilities: {
        experimentalApi: true,
        optOutNotificationMethods: [
          "account/updated",
          "remoteControl/status/changed",
          "item/agentMessage/delta",
        ],
      },
    });
    this.sendNotification("initialized", {});
    this.log("Codex app-server inicializado.");
  }

  async request(method, params) {
    await this.ensureStarted();
    return this.requestInternal(method, params);
  }

  requestInternal(method, params) {
    const id = this.nextRequestId++;
    const appServerProcess = this.process;

    if (!appServerProcess?.stdin.writable) {
      return Promise.reject(new Error("Codex app-server não está disponível para receber comandos."));
    }

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new Error(`Tempo esgotado ao chamar ${method} no Codex app-server.`));
      }, 30000);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      appServerProcess.stdin.write(`${JSON.stringify({ method, id, params })}\n`, (error) => {
        if (error) {
          const pending = this.pendingRequests.get(id);
          if (pending) {
            clearTimeout(pending.timeout);
            this.pendingRequests.delete(id);
            pending.reject(error);
          }
        }
      });
    });
  }

  sendNotification(method, params) {
    if (this.process?.stdin.writable) {
      this.process.stdin.write(`${JSON.stringify({ method, params })}\n`);
    }
  }

  handleLine(line) {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      this.log(`[app-server:saída inválida] ${line}`);
      return;
    }

    if (typeof message.id === "number" && ("result" in message || "error" in message)) {
      const pending = this.pendingRequests.get(message.id);
      if (!pending) {
        return;
      }
      clearTimeout(pending.timeout);
      this.pendingRequests.delete(message.id);

      if (message.error) {
        pending.reject(new Error(`Codex app-server: ${message.error.message} (${message.error.code})`));
      } else {
        pending.resolve(message.result);
      }
      return;
    }

    if (typeof message.method !== "string") {
      return;
    }

    if (typeof message.id === "number") {
      this.process?.stdin.write(
        `${JSON.stringify({
          id: message.id,
          error: { code: -32601, message: `Método não suportado pelo cliente: ${message.method}` },
        })}\n`,
      );
      return;
    }

    if (sessionChangingNotifications.has(message.method)) {
      this.events.emit("sessionsChanged");
    }
  }

  handleProcessFailure(error) {
    this.log(error.message);
    this.outputReader?.close();
    this.outputReader = undefined;
    this.process = undefined;
    this.startPromise = undefined;
    this.rejectPendingRequests(error);
  }

  rejectPendingRequests(error) {
    for (const pending of this.pendingRequests.values()) {
      clearTimeout(pending.timeout);
      pending.reject(error);
    }
    this.pendingRequests.clear();
  }
}

module.exports = { CodexAppServerClient };

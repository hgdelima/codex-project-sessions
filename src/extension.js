"use strict";

const path = require("node:path");
const fs = require("node:fs");
const vscode = require("vscode");
const { CodexAppServerClient } = require("./codexAppServerClient");
const { SessionDetailsProvider } = require("./sessionDetailsProvider");
const {
  relativeFolderLabel,
  SessionTreeProvider,
  unwrapSession,
} = require("./sessionTreeProvider");

const viewId = "codexProjectSessions.sessionsView";
const selectedFolderKey = "codexProjectSessions.selectedFolder";
const folderPinnedKey = "codexProjectSessions.folderPinned";
const allFoldersKey = "codexProjectSessions.allFolders";

function activate(context) {
  const output = vscode.window.createOutputChannel("Codex Project Sessions", { log: true });
  context.subscriptions.push(output);

  let client = createClient(context, output);
  const provider = new SessionTreeProvider(client);
  const detailsProvider = new SessionDetailsProvider();
  detailsProvider.register(context);

  const treeView = vscode.window.createTreeView(viewId, {
    treeDataProvider: provider,
    showCollapseAll: true,
  });
  context.subscriptions.push(treeView);

  let folderPinned = context.workspaceState.get(folderPinnedKey, false);
  let allFolders = context.workspaceState.get(allFoldersKey, false);
  let refreshTimer;
  let periodicRefresh;
  let clientChangeSubscription = client.onDidChangeSessions(() => scheduleRefresh(300));

  const updateView = () => {
    const folder = provider.folder;
    const workspaceFolder = folder ? vscode.workspace.getWorkspaceFolder(vscode.Uri.file(folder)) : undefined;
    treeView.description = folder
      ? `${folderPinned ? "📌 " : ""}${relativeFolderLabel(folder, workspaceFolder)}`
      : undefined;
    treeView.message = provider.message;
    void vscode.commands.executeCommand("setContext", "codexProjectSessions.folderPinned", folderPinned);
  };

  const refresh = async () => {
    clearTimeout(refreshTimer);
    refreshTimer = undefined;
    updateView();
    const configuration = getConfiguration();
    await provider.refresh(configuration.filterMode, configuration.maxSessions);
    updateView();
  };

  function scheduleRefresh(delayMilliseconds = 0) {
    clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => void refresh(), delayMilliseconds);
  }

  const setFolder = async (folderPath, pinned, showAll = false) => {
    folderPinned = pinned;
    allFolders = showAll;
    provider.setFolder(folderPath);
    await context.workspaceState.update(selectedFolderKey, folderPath);
    await context.workspaceState.update(folderPinnedKey, pinned);
    await context.workspaceState.update(allFoldersKey, showAll);
    updateView();
    scheduleRefresh();
  };

  const followActiveWorkspace = async () => {
    const folder = activeWorkspaceFolder() ?? vscode.workspace.workspaceFolders?.[0];
    await setFolder(folder?.uri.fsPath, false);
  };

  const configurePeriodicRefresh = () => {
    clearInterval(periodicRefresh);
    const intervalSeconds = getConfiguration().refreshIntervalSeconds;
    if (intervalSeconds > 0) {
      periodicRefresh = setInterval(() => {
        if (treeView.visible) {
          scheduleRefresh();
        }
      }, intervalSeconds * 1000);
    }
  };

  const recreateClient = () => {
    clientChangeSubscription.dispose();
    client.dispose();
    client = createClient(context, output);
    provider.setClient(client);
    clientChangeSubscription = client.onDidChangeSessions(() => scheduleRefresh(300));
  };

  context.subscriptions.push(
    vscode.commands.registerCommand("codexProjectSessions.refresh", refresh),
    vscode.commands.registerCommand("codexProjectSessions.chooseFolder", async () => {
      const selected = await vscode.window.showOpenDialog({
        title: "Escolha a pasta usada para filtrar as sessões do Codex",
        defaultUri: provider.folder ? vscode.Uri.file(provider.folder) : activeWorkspaceFolder()?.uri,
        canSelectFiles: false,
        canSelectFolders: true,
        canSelectMany: false,
        openLabel: "Usar esta pasta",
      });
      if (selected?.[0]) {
        await setFolder(selected[0].fsPath, true);
      }
    }),
    vscode.commands.registerCommand("codexProjectSessions.clearFolderFilter", async () => {
      await setFolder(undefined, false, true);
    }),
    vscode.commands.registerCommand(
      "codexProjectSessions.useExplorerFolder",
      async (resource, selectedResources) => {
        const selected = resource ?? selectedResources?.[0];
        if (selected?.scheme === "file") {
          await setFolder(selected.fsPath, true);
        }
      },
    ),
    vscode.commands.registerCommand(
      "codexProjectSessions.filterExplorerFolder",
      async (resource, selectedResources) => {
        const selected = resource ?? selectedResources?.[0];
        if (selected?.scheme === "file") {
          await setFolder(selected.fsPath, true);
        }
      },
    ),
    vscode.commands.registerCommand(
      "codexProjectSessions.newSessionAtExplorerFolder",
      async (resource, selectedResources) => {
        const selected = resource ?? selectedResources?.[0];
        if (selected?.scheme === "file") {
          await createNewSession(selected.fsPath);
        }
      },
    ),
    vscode.commands.registerCommand("codexProjectSessions.followActiveWorkspace", followActiveWorkspace),
    vscode.commands.registerCommand("codexProjectSessions.resumeSession", async (value) => {
      const session = unwrapSession(value);
      if (session) {
        await openCodexSession(session);
      }
    }),
    vscode.commands.registerCommand("codexProjectSessions.moveSession", async (value) => {
      const session = unwrapSession(value);
      if (session) {
        await moveSession(session);
      }
    }),
    vscode.commands.registerCommand("codexProjectSessions.deleteSession", async (value) => {
      const session = unwrapSession(value);
      if (session) {
        await deleteSession(session);
      }
    }),
    vscode.commands.registerCommand("codexProjectSessions.showDetails", async (value) => {
      const session = unwrapSession(value);
      if (session) {
        await detailsProvider.show(session);
      }
    }),
    vscode.commands.registerCommand("codexProjectSessions.copySessionId", async (value) => {
      const session = unwrapSession(value);
      if (session) {
        await vscode.env.clipboard.writeText(session.id);
        void vscode.window.showInformationMessage("ID da sessão copiado.");
      }
    }),
    vscode.commands.registerCommand("codexProjectSessions.revealSessionFolder", async (value) => {
      const session = unwrapSession(value);
      if (session) {
        await vscode.commands.executeCommand("revealInExplorer", vscode.Uri.file(session.cwd));
      }
    }),
    vscode.commands.registerCommand("codexProjectSessions.openCodexSidebar", async () => {
      const commands = await vscode.commands.getCommands(true);
      if (commands.includes("chatgpt.openSidebar")) {
        await vscode.commands.executeCommand("chatgpt.openSidebar");
      } else {
        void vscode.window.showWarningMessage("A extensão oficial do Codex não está instalada ou ativa.");
      }
    }),
    vscode.window.onDidChangeActiveTextEditor(async () => {
      if (!folderPinned && !allFolders && getConfiguration().followActiveWorkspace) {
        const activeFolder = activeExplorerFolder();
        if (activeFolder && activeFolder.uri.fsPath !== provider.folder) {
          await setFolder(activeFolder.uri.fsPath, false);
        }
      }
    }),
    vscode.workspace.onDidChangeWorkspaceFolders(async () => {
      if (allFolders) {
        scheduleRefresh();
      } else if (!folderPinned || !provider.folder || !isInsideOpenWorkspace(provider.folder)) {
        await followActiveWorkspace();
      } else {
        scheduleRefresh();
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration("codexProjectSessions")) {
        return;
      }
      if (event.affectsConfiguration("codexProjectSessions.codexPath")) {
        recreateClient();
      }
      configurePeriodicRefresh();
      scheduleRefresh();
    }),
    treeView.onDidChangeVisibility((event) => {
      if (event.visible) {
        scheduleRefresh();
      }
    }),
    {
      dispose: () => {
        clearTimeout(refreshTimer);
        clearInterval(periodicRefresh);
        clientChangeSubscription.dispose();
        client.dispose();
      },
    },
  );

  const savedFolder = context.workspaceState.get(selectedFolderKey);
  if (allFolders) {
    provider.setFolder(undefined);
  } else if (folderPinned && savedFolder && isInsideOpenWorkspace(savedFolder)) {
    provider.setFolder(savedFolder);
  } else {
    folderPinned = false;
    provider.setFolder((activeWorkspaceFolder() ?? vscode.workspace.workspaceFolders?.[0])?.uri.fsPath);
  }

  configurePeriodicRefresh();
  updateView();
  scheduleRefresh();

  function getConfiguration() {
    const configuration = vscode.workspace.getConfiguration("codexProjectSessions");
    return {
      codexPath: configuration.get("codexPath", "codex").trim() || "codex",
      filterMode: configuration.get("filterMode", "subtree"),
      followActiveWorkspace: configuration.get("followActiveWorkspace", true),
      refreshIntervalSeconds: configuration.get("refreshIntervalSeconds", 15),
      maxSessions: configuration.get("maxSessions", 200),
    };
  }

  async function openCodexSession(session) {
    const officialExtension = vscode.extensions.getExtension("openai.chatgpt");
    if (!officialExtension) {
      void vscode.window.showWarningMessage(
        "A extensão oficial do Codex não está instalada ou ativa; não é possível abrir a sessão na janela do Codex.",
      );
      return;
    }

    await officialExtension.activate();
    const conversationUri = vscode.Uri.file(`/local/${session.id}`).with({
      scheme: "openai-codex",
      authority: "route",
    });
    await vscode.commands.executeCommand(
      "vscode.openWith",
      conversationUri,
      "chatgpt.conversationEditor",
      { preserveFocus: false, preview: false },
    );
  }

  async function moveSession(session) {
    const selected = await vscode.window.showOpenDialog({
      title: "Escolha a nova pasta da sessão",
      defaultUri: vscode.Uri.file(session.cwd),
      canSelectFiles: false,
      canSelectFolders: true,
      canSelectMany: false,
      openLabel: "Mover sessão para esta pasta",
    });
    if (!selected?.[0] || selected[0].fsPath === session.cwd) {
      return;
    }

    try {
      await client.request("thread/settings/update", {
        threadId: session.id,
        cwd: selected[0].fsPath,
      });
      void vscode.window.showInformationMessage("Sessão movida para a nova pasta.");
      scheduleRefresh();
    } catch (error) {
      void vscode.window.showErrorMessage(`Não foi possível mover a sessão: ${error.message}`);
    }
  }

  async function deleteSession(session) {
    const confirmation = await vscode.window.showWarningMessage(
      `Excluir a sessão “${sessionTitleForMessage(session)}”? Esta ação não pode ser desfeita.`,
      { modal: true },
      "Excluir sessão",
    );
    if (confirmation !== "Excluir sessão") {
      return;
    }

    try {
      await client.request("thread/delete", { threadId: session.id });
      void vscode.window.showInformationMessage("Sessão excluída.");
      scheduleRefresh();
    } catch (error) {
      void vscode.window.showErrorMessage(`Não foi possível excluir a sessão: ${error.message}`);
    }
  }

  async function createNewSession(folderPath) {
    try {
      const response = await client.request("thread/start", { cwd: folderPath });
      const threadId = response?.thread?.id;
      if (!threadId) {
        throw new Error("O Codex não retornou o ID da nova sessão.");
      }
      await openCodexSession({ id: threadId });
      scheduleRefresh();
    } catch (error) {
      void vscode.window.showErrorMessage(`Não foi possível criar a sessão: ${error.message}`);
    }
  }
}

function sessionTitleForMessage(session) {
  const title = session.name?.trim() || session.preview?.split(/\r?\n/).find(Boolean)?.trim();
  return title || session.id;
}

function deactivate() {}

function createClient(context, output) {
  const configuredPath =
    vscode.workspace.getConfiguration("codexProjectSessions").get("codexPath", "codex").trim() ||
    "codex";
  const codexPath = resolveCodexPath(configuredPath);
  return new CodexAppServerClient(codexPath, context.extension.packageJSON.version, (message) => {
    output.info(message);
  });
}

function resolveCodexPath(configuredPath) {
  if (configuredPath !== "codex") {
    return configuredPath;
  }

  // O VS Code iniciado pelo Finder nem sempre herda o PATH do shell. A
  // extensão oficial do Codex já inclui o executável, então use-o quando
  // estiver instalado e deixe "codex" como fallback para instalações via PATH.
  const officialExtension = vscode.extensions.getExtension("openai.chatgpt");
  const bundledCandidates = officialExtension
    ? [
        path.join(officialExtension.extensionPath, "bin", "macos-aarch64", "codex"),
        path.join(officialExtension.extensionPath, "bin", "macos-x86_64", "codex"),
        path.join(officialExtension.extensionPath, "bin", "linux-x86_64", "codex"),
        path.join(officialExtension.extensionPath, "bin", "win32-x86_64", "codex.exe"),
      ]
    : [];

  return bundledCandidates.find((candidate) => fs.existsSync(candidate)) ?? "codex";
}

function activeWorkspaceFolder() {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  return activeUri ? vscode.workspace.getWorkspaceFolder(activeUri) : undefined;
}

function activeExplorerFolder() {
  const activeUri = vscode.window.activeTextEditor?.document.uri;
  if (!activeUri || activeUri.scheme !== "file") {
    return undefined;
  }

  const workspaceFolder = vscode.workspace.getWorkspaceFolder(activeUri);
  if (!workspaceFolder) {
    return undefined;
  }

  return {
    name: path.basename(path.dirname(activeUri.fsPath)),
    uri: vscode.Uri.file(path.dirname(activeUri.fsPath)),
  };
}

function isInsideOpenWorkspace(folderPath) {
  return Boolean(vscode.workspace.getWorkspaceFolder(vscode.Uri.file(path.resolve(folderPath))));
}

module.exports = { activate, deactivate };

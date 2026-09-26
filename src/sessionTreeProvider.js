"use strict";

const path = require("node:path");
const vscode = require("vscode");
const {
  formatRelativeTime,
  groupSessions,
  isExactPath,
  isPathWithin,
  sessionTitle,
  sourceLabel,
} = require("./sessionModel");

class SessionTreeProvider {
  constructor(client) {
    this.client = client;
    this.treeChanged = new vscode.EventEmitter();
    this.onDidChangeTreeData = this.treeChanged.event;
    this.groups = [];
    this.locations = [];
    this.workspaceFolders = [];
    this.selectedFolder = undefined;
    this.loading = false;
    this.lastError = undefined;
    this.refreshGeneration = 0;
  }

  setClient(client) {
    this.client = client;
  }

  setFolder(folderPath) {
    this.selectedFolder = folderPath;
    this.groups = [];
    this.lastError = undefined;
    this.treeChanged.fire(undefined);
  }

  setWorkspaceFolders(workspaceFolders) {
    this.workspaceFolders = workspaceFolders ?? [];
    this.locations = buildLocations(this.workspaceFolders, this.groups);
    this.treeChanged.fire(undefined);
  }

  get folder() {
    return this.selectedFolder;
  }

  get count() {
    return this.groups.reduce((total, group) => total + group.sessions.length, 0);
  }

  get message() {
    if (this.loading) {
      return "Carregando sessões do Codex…";
    }
    if (this.lastError) {
      return this.lastError;
    }
    if (this.count === 0) {
      return this.selectedFolder
        ? "Nenhuma sessão encontrada para esta pasta."
        : "Nenhuma sessão encontrada.";
    }
    return undefined;
  }

  async refresh(filterMode, maxSessions) {
    const folder = this.selectedFolder;
    const generation = ++this.refreshGeneration;
    this.loading = true;
    this.lastError = undefined;
    this.treeChanged.fire(undefined);

    try {
      const sessions = await this.client.listSessions({
        params: {
          archived: false,
          sortKey: "updated_at",
          sortDirection: "desc",
          sourceKinds: ["cli", "vscode"],
          cwd: folder && filterMode === "exact" ? folder : undefined,
        },
        maxResults: maxSessions,
        matches: folder
          ? filterMode === "exact"
            ? (session) => isExactPath(folder, session.cwd)
            : (session) => isPathWithin(folder, session.cwd)
          : undefined,
      });

      if (generation !== this.refreshGeneration) {
        return;
      }
      this.groups = groupSessions(sessions);
      this.locations = buildLocations(this.workspaceFolders, this.groups);
    } catch (error) {
      if (generation !== this.refreshGeneration) {
        return;
      }
      this.groups = [];
      this.lastError = friendlyError(error);
    } finally {
      if (generation === this.refreshGeneration) {
        this.loading = false;
        this.treeChanged.fire(undefined);
      }
    }
  }

  getTreeItem(element) {
    return element;
  }

  getChildren(element) {
    if (!element) {
      const children = [];
      if (this.locations.length > 0) {
        children.push(new LocationGroupItem(this.locations));
      }
      children.push(...this.groups.map((group) => new SessionGroupItem(group)));
      return children;
    }
    if (element instanceof LocationGroupItem) {
      return element.locations.map((location) => new LocationItem(location));
    }
    if (element instanceof SessionGroupItem) {
      return element.group.sessions.map((session) => new SessionItem(session));
    }
    return [];
  }
}

class SessionGroupItem extends vscode.TreeItem {
  constructor(group) {
    super(`${group.label} (${group.sessions.length})`, vscode.TreeItemCollapsibleState.Expanded);
    this.group = group;
    this.contextValue = "codexSessionGroup";
    this.iconPath = new vscode.ThemeIcon("calendar");
  }
}

class LocationGroupItem extends vscode.TreeItem {
  constructor(locations) {
    super(`Workspaces e pastas (${locations.length})`, vscode.TreeItemCollapsibleState.Expanded);
    this.locations = locations;
    this.contextValue = "codexLocationGroup";
    this.iconPath = new vscode.ThemeIcon("folder-library");
  }
}

class LocationItem extends vscode.TreeItem {
  constructor(location) {
    super(location.label, vscode.TreeItemCollapsibleState.None);
    this.location = location;
    this.contextValue = "codexLocation";
    this.description = location.kind === "workspace" ? "workspace" : location.workspaceLabel;
    this.iconPath = new vscode.ThemeIcon(location.kind === "workspace" ? "root-folder" : "folder");
    this.tooltip = `${location.kind === "workspace" ? "Workspace" : "Pasta"}: ${location.path}`;
    this.command = {
      command: "codexProjectSessions.filterLocation",
      title: "Filtrar sessões por este local",
      arguments: [this],
    };
  }
}

class SessionItem extends vscode.TreeItem {
  constructor(session) {
    super(sessionTitle(session), vscode.TreeItemCollapsibleState.None);
    this.session = session;
    this.contextValue = "codexSession";
    this.description = `${formatRelativeTime(session.updatedAt)} · ${sourceLabel(session.source)}`;
    this.iconPath = sessionIcon(session);
    this.command = {
      command: "codexProjectSessions.resumeSession",
      title: "Abrir sessão no Codex",
      arguments: [this],
    };
    this.tooltip = buildTooltip(session);
    this.accessibilityInformation = {
      label: `${sessionTitle(session)}. Atualizada ${formatRelativeTime(session.updatedAt)}.`,
      role: "button",
    };
  }
}

function unwrapSession(value) {
  if (!value) {
    return undefined;
  }
  return value instanceof SessionItem ? value.session : value;
}

function unwrapLocation(value) {
  if (!value) {
    return undefined;
  }
  return value instanceof LocationItem ? value.location : value;
}

function sessionIcon(session) {
  if (session.status?.type === "active") {
    return new vscode.ThemeIcon("sync~spin");
  }
  if (session.source === "vscode") {
    return new vscode.ThemeIcon("comment-discussion");
  }
  return new vscode.ThemeIcon("terminal");
}

function buildTooltip(session) {
  const tooltip = new vscode.MarkdownString(undefined, true);
  tooltip.appendMarkdown(`**${escapeMarkdown(sessionTitle(session, 160))}**\n\n`);
  tooltip.appendMarkdown(`- Pasta: \`${session.cwd}\`\n`);
  tooltip.appendMarkdown(`- Origem: ${escapeMarkdown(sourceLabel(session.source))}\n`);
  tooltip.appendMarkdown(`- Modelo: ${escapeMarkdown(session.model ?? "não informado")}\n`);
  tooltip.appendMarkdown(
    `- Atualizada: ${new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(
      new Date(session.updatedAt * 1000),
    )}\n`,
  );
  tooltip.appendMarkdown(`- ID: \`${session.id}\``);
  return tooltip;
}

function friendlyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/ENOENT|not found|não foi possível encontrar/i.test(message)) {
    return "Codex CLI não encontrado. Configure codexProjectSessions.codexPath.";
  }
  return `Não foi possível carregar as sessões: ${message}`;
}

function escapeMarkdown(value) {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}

function buildLocations(workspaceFolders, groups) {
  const locations = new Map();
  const workspaceByPath = new Map();

  for (const workspaceFolder of workspaceFolders) {
    const workspacePath = path.resolve(workspaceFolder.uri.fsPath);
    const location = {
      kind: "workspace",
      label: workspaceFolder.name,
      path: workspacePath,
      workspaceLabel: workspaceFolder.name,
    };
    locations.set(workspacePath, location);
    workspaceByPath.set(workspacePath, location);
  }

  const sessions = groups.flatMap((group) => group.sessions);
  for (const session of sessions) {
    const sessionPath = path.resolve(session.cwd);
    const workspace = [...workspaceByPath.values()].find((candidate) =>
      isPathWithin(candidate.path, sessionPath),
    );
    if (!workspace || sessionPath === workspace.path) {
      continue;
    }

    let currentPath = sessionPath;
    while (isPathWithin(workspace.path, currentPath) && currentPath !== workspace.path) {
      if (!locations.has(currentPath)) {
        locations.set(currentPath, {
          kind: "folder",
          label: path.relative(workspace.path, currentPath),
          path: currentPath,
          workspaceLabel: workspace.label,
        });
      }
      currentPath = path.dirname(currentPath);
    }
  }

  return [...locations.values()].sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "workspace" ? -1 : 1;
    }
    return left.label.localeCompare(right.label, "pt-BR");
  });
}

function relativeFolderLabel(folderPath, workspaceFolder) {
  if (!workspaceFolder) {
    return path.basename(folderPath);
  }
  const relativePath = path.relative(workspaceFolder.uri.fsPath, folderPath);
  return relativePath ? `${workspaceFolder.name}/${relativePath}` : workspaceFolder.name;
}

module.exports = {
  relativeFolderLabel,
  LocationItem,
  SessionItem,
  SessionTreeProvider,
  unwrapLocation,
  unwrapSession,
};

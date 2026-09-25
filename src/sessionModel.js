"use strict";

const path = require("node:path");

const bucketOrder = ["today", "yesterday", "week", "older"];

const bucketLabels = {
  today: "Hoje",
  yesterday: "Ontem",
  week: "Últimos 7 dias",
  older: "Mais antigas",
};

function isPathWithin(rootPath, candidatePath) {
  const normalizeCase = process.platform === "win32" || process.platform === "darwin";
  let normalizedRoot = path.resolve(rootPath);
  let normalizedCandidate = path.resolve(candidatePath);

  if (normalizeCase) {
    normalizedRoot = normalizedRoot.toLocaleLowerCase();
    normalizedCandidate = normalizedCandidate.toLocaleLowerCase();
  }

  const relativePath = path.relative(normalizedRoot, normalizedCandidate);
  return (
    relativePath === "" ||
    (!relativePath.startsWith(`..${path.sep}`) &&
      relativePath !== ".." &&
      !path.isAbsolute(relativePath))
  );
}

function isExactPath(leftPath, rightPath) {
  return isPathWithin(leftPath, rightPath) && isPathWithin(rightPath, leftPath);
}

function sessionTitle(session, maxLength = 90) {
  const candidate = session.name?.trim() || firstMeaningfulLine(session.preview) || "Sessão sem título";
  const compact = candidate.replace(/\s+/g, " ");
  return compact.length <= maxLength ? compact : `${compact.slice(0, maxLength - 1)}…`;
}

function formatRelativeTime(timestampSeconds, now = new Date()) {
  const differenceSeconds = timestampSeconds - Math.floor(now.getTime() / 1000);
  const absoluteSeconds = Math.abs(differenceSeconds);
  const formatter = new Intl.RelativeTimeFormat("pt-BR", { numeric: "auto" });

  if (absoluteSeconds < 60) {
    return formatter.format(Math.round(differenceSeconds), "second");
  }
  if (absoluteSeconds < 3600) {
    return formatter.format(Math.round(differenceSeconds / 60), "minute");
  }
  if (absoluteSeconds < 86400) {
    return formatter.format(Math.round(differenceSeconds / 3600), "hour");
  }
  if (absoluteSeconds < 604800) {
    return formatter.format(Math.round(differenceSeconds / 86400), "day");
  }

  const sessionDate = new Date(timestampSeconds * 1000);
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "short",
    year: now.getFullYear() === sessionDate.getFullYear() ? undefined : "numeric",
  }).format(sessionDate);
}

function groupSessions(sessions, now = new Date()) {
  const grouped = new Map();

  for (const session of [...sessions].sort((left, right) => right.updatedAt - left.updatedAt)) {
    const bucket = sessionBucket(session.updatedAt, now);
    const bucketSessions = grouped.get(bucket) ?? [];
    bucketSessions.push(session);
    grouped.set(bucket, bucketSessions);
  }

  return bucketOrder
    .filter((bucket) => grouped.has(bucket))
    .map((bucket) => ({
      id: bucket,
      label: bucketLabels[bucket],
      sessions: grouped.get(bucket) ?? [],
    }));
}

function renderSessionMarkdown(session) {
  const updatedAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date(session.updatedAt * 1000));
  const createdAt = new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date(session.createdAt * 1000));

  return [
    `# ${escapeMarkdown(sessionTitle(session, 160))}`,
    "",
    `- **ID:** \`${session.id}\``,
    `- **Pasta:** \`${session.cwd}\``,
    `- **Origem:** ${escapeMarkdown(sourceLabel(session.source))}`,
    `- **Modelo:** ${escapeMarkdown(session.model ?? "não informado")}`,
    `- **Status:** ${escapeMarkdown(session.status?.type ?? "não informado")}`,
    `- **Criada em:** ${createdAt}`,
    `- **Atualizada em:** ${updatedAt}`,
    "",
    "## Solicitação inicial",
    "",
    session.preview.trim() || "_Sem prévia disponível._",
    "",
    "---",
    "",
    "Use **Abrir sessão no Codex** no painel para continuar a conversa na janela do Codex.",
  ].join("\n");
}

function sourceLabel(source) {
  if (source === "vscode") {
    return "Codex Desktop/VS Code";
  }
  if (source === "cli") {
    return "Codex CLI";
  }
  return source;
}

function sessionBucket(timestampSeconds, now) {
  const sessionDate = startOfDay(new Date(timestampSeconds * 1000));
  const today = startOfDay(now);
  const dayDifference = Math.round((today.getTime() - sessionDate.getTime()) / 86400000);

  if (dayDifference <= 0) {
    return "today";
  }
  if (dayDifference === 1) {
    return "yesterday";
  }
  if (dayDifference <= 7) {
    return "week";
  }
  return "older";
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function firstMeaningfulLine(value) {
  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
}

function escapeMarkdown(value) {
  return value.replace(/[\\`*_{}[\]()#+\-.!]/g, "\\$&");
}

module.exports = {
  formatRelativeTime,
  groupSessions,
  isExactPath,
  isPathWithin,
  renderSessionMarkdown,
  sessionTitle,
  sourceLabel,
};

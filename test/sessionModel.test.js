"use strict";

const assert = require("node:assert/strict");
const test = require("node:test");
const {
  groupSessions,
  isExactPath,
  isPathWithin,
  sessionTitle,
} = require("../src/sessionModel");

test("reconhece a própria pasta e subpastas", () => {
  assert.equal(isPathWithin("/workspace/projeto", "/workspace/projeto"), true);
  assert.equal(isPathWithin("/workspace/projeto", "/workspace/projeto/src/api"), true);
  assert.equal(isPathWithin("/workspace/projeto", "/workspace/projeto-antigo"), false);
  assert.equal(isPathWithin("/workspace/projeto", "/workspace/outro"), false);
});

test("compara caminhos exatos após normalização", () => {
  assert.equal(isExactPath("/workspace/projeto/", "/workspace/projeto"), true);
  assert.equal(isExactPath("/workspace/projeto", "/workspace/projeto/src"), false);
});

test("prioriza o nome da sessão e limita o título", () => {
  const session = createSession({
    name: "Corrigir integração de pagamentos",
    preview: "Mensagem inicial que não deve ser usada",
  });
  assert.equal(sessionTitle(session), "Corrigir integração de pagamentos");
  assert.equal(sessionTitle({ ...session, name: null, preview: "\n  Primeira linha\nSegunda" }), "Primeira linha");
  assert.equal(sessionTitle({ ...session, name: "123456789" }, 6), "12345…");
});

test("agrupa sessões por recência", () => {
  const now = new Date(2026, 8, 25, 12, 0, 0);
  const at = (daysAgo) => Math.floor(new Date(2026, 8, 25 - daysAgo, 9, 0, 0).getTime() / 1000);
  const sessions = [
    createSession({ id: "older", updatedAt: at(15) }),
    createSession({ id: "week", updatedAt: at(4) }),
    createSession({ id: "today", updatedAt: at(0) }),
    createSession({ id: "yesterday", updatedAt: at(1) }),
  ];

  const groups = groupSessions(sessions, now);
  assert.deepEqual(
    groups.map((group) => [group.label, group.sessions.map((session) => session.id)]),
    [
      ["Hoje", ["today"]],
      ["Ontem", ["yesterday"]],
      ["Últimos 7 dias", ["week"]],
      ["Mais antigas", ["older"]],
    ],
  );
});

function createSession(overrides = {}) {
  return {
    id: "session-id",
    sessionId: "session-id",
    preview: "Solicitação inicial",
    cwd: "/workspace/projeto",
    createdAt: 1,
    updatedAt: 1,
    source: "cli",
    ...overrides,
  };
}

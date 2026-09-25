# Security Review

## Identificação

- Extension ID: `local.codex-project-sessions`
- Versão: `0.1.0`
- Runtime: VS Code Extension Host, JavaScript CommonJS
- Dependências de runtime: nenhuma
- Dependências de build: nenhuma

## Finalidade

Listar sessões locais do Codex por diretório de trabalho e permitir que o usuário abra uma sessão na janela da extensão oficial do Codex.

## Processos executados

| Processo | Momento | Finalidade |
|---|---|---|
| `codex app-server --stdio` | Ao carregar/atualizar o painel | Consulta local de metadados via JSON-RPC |
| `vscode.open` com URI `openai-codex://route/local/<session-id>` | Após ação explícita do usuário | Abrir a sessão no editor da extensão oficial do Codex |

## Dados acessados

- Metadados retornados pelo app-server: ID, título, prévia, timestamps, origem, modelo, status e diretório de trabalho.
- Pastas do workspace, apenas para associação e navegação.
- Clipboard, somente quando o usuário executa **Copiar ID da sessão**.

## Dados não acessados

- A extensão não lê diretamente os arquivos em `~/.codex/sessions`.
- A extensão não coleta credenciais ou tokens.
- A extensão não implementa chamadas HTTP, sockets de rede ou telemetria própria.
- A extensão não modifica código automaticamente.

## Escritas e efeitos

- Estado local do workspace: pasta selecionada e opção de filtro fixado.
- Abertura do editor de conversa oficial após ação explícita do usuário.
- Abertura de documentos virtuais Markdown para exibir detalhes da sessão.

## Atualizações

A extensão não possui atualização automática própria. Cada versão nova requer um novo VSIX, hash e liberação explícita na allowlist.

## Validações executadas

- Verificação sintática de todos os arquivos JavaScript.
- Testes unitários de associação de caminhos, títulos e agrupamento temporal.
- Smoke test real com `codex app-server` e filtro pelo diretório do projeto.
- Teste de integridade estrutural do VSIX com `unzip -t`.

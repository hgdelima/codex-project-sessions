# Codex Project Sessions

Extensão para organizar e retomar sessões locais do Codex por workspace ou pasta diretamente no VS Code.

## O que ela faz

- Adiciona o painel **Sessões do Codex** na barra lateral secundária (à direita).
- Lista sessões do Codex Desktop, da extensão oficial e do Codex CLI usando o `codex app-server`.
- Filtra pela pasta atual, opcionalmente incluindo todas as subpastas.
- Acompanha automaticamente a pasta do arquivo ativo no Explorer.
- Permite fixar qualquer pasta pelo menu de contexto do Explorer.
- Abre uma sessão diretamente no editor/painel da extensão oficial do Codex.
- Permite excluir ou mover uma sessão para outra pasta pelas ações inline da lista.
- Permite limpar o filtro de pasta pelo botão de borracha no título do painel.
- Exibe workspaces e pastas com ações inline para filtrar, limpar o filtro e criar uma nova sessão naquele local.
- Exibe detalhes da sessão e oferece atalhos para copiar o ID ou revelar sua pasta.

## Uso

1. Abra o painel **Sessões do Codex** na barra lateral secundária. Se ela estiver oculta, use **View: Toggle Secondary Side Bar**.
2. Para fixar uma pasta específica, clique nela com o botão direito no Explorer e escolha **Codex Sessions: Usar pasta para sessões do Codex**.
3. Clique em uma sessão para abri-la na janela do Codex.
4. Use o botão de alvo no título do painel para voltar a acompanhar o workspace do arquivo ativo.

Ao abrir um arquivo pelo Explorer, o filtro acompanha automaticamente a pasta desse arquivo. Para selecionar uma pasta sem abrir arquivo, use o comando **Codex Sessions: Usar pasta para sessões do Codex** no menu de contexto.

## Requisitos

- Codex CLI instalado, autenticado e disponível no `PATH` como `codex` (usado pelo app-server para listar as sessões).
- VS Code 1.106 ou superior (necessário para registrar o painel na barra lateral secundária).
- Extensão oficial do Codex instalada e ativa para abrir sessões na janela do Codex.

## Desenvolvimento

```bash
npm test
npm run package
```

O projeto não possui dependências externas. O último comando gera um arquivo `.vsix`, que pode ser instalado por **Extensions: Install from VSIX...**.

Para gerar um pacote portátil com VSIX, código-fonte, checksums, documentação de segurança e instruções de allowlist:

```bash
npm run bundle
```

## Configurações

- `codexProjectSessions.codexPath`: caminho do executável do Codex CLI. O valor `codex` detecta automaticamente o CLI incluído pela extensão oficial do Codex quando o VS Code não herda o `PATH` do shell.
- `codexProjectSessions.filterMode`: `subtree` inclui subpastas; `exact` exige correspondência exata.
- `codexProjectSessions.followActiveWorkspace`: acompanha o workspace do arquivo ativo enquanto o filtro não estiver fixado.
- `codexProjectSessions.refreshIntervalSeconds`: intervalo de atualização automática; `0` desativa.
- `codexProjectSessions.maxSessions`: limite de sessões exibidas.

## Arquitetura

A extensão usa a API JSON-RPC oficial do `codex app-server` para listar metadados das sessões com `thread/list`. Ela não lê nem modifica diretamente os arquivos internos em `~/.codex/sessions`.

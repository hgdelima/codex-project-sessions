# Solicitação de liberação no VS Code

Solicito a inclusão da extensão interna abaixo na política corporativa `AllowedExtensions`:

| Campo | Valor |
|---|---|
| Extension ID | `local.codex-project-sessions` |
| Versão | `0.1.0` |
| Plataforma | VS Code Desktop, macOS/Windows |
| Distribuição | VSIX interno |
| Dependências externas | Nenhuma |
| Rede própria | Nenhuma |

Entrada solicitada para ser **mesclada** à lista existente:

```json
"local.codex-project-sessions": ["0.1.0"]
```

Objetivo: disponibilizar no VS Code um painel lateral que liste sessões locais do Codex filtradas pelo workspace ou pasta selecionada.

A extensão usa o protocolo local `codex app-server --stdio` para consultar metadados de sessões e executa `codex resume` somente quando o usuário escolhe continuar uma sessão. Ela não lê diretamente `~/.codex/sessions`, não envia telemetria própria e não inclui bibliotecas de terceiros.

Arquivos para revisão:

- `codex-project-sessions-0.1.0.vsix`
- `codex-project-sessions-0.1.0-source.zip`
- `SECURITY-REVIEW.md`
- `SHA256SUMS.txt`

# Instalação em outro laptop

Este pacote foi preparado para instalação em máquinas com uma lista corporativa de extensões permitidas.
Ele não altera nem contorna políticas do VS Code.

## Pré-requisitos

- VS Code 1.106 ou superior (necessário para registrar o painel na barra lateral secundária).
- Codex CLI instalado, autenticado e disponível como `codex` no `PATH`.
- Liberação do ID `local.codex-project-sessions`, versão `0.1.0`, na política corporativa.

## 1. Solicitar a liberação

Envie `SOLICITACAO-LIBERACAO.md` e `SECURITY-REVIEW.md` ao time responsável pelo MDM/VS Code.
A entrada deve ser mesclada à política existente, sem substituir as extensões já autorizadas:

```json
"local.codex-project-sessions": ["0.1.0"]
```

## 2. Confirmar a política

Depois da liberação:

1. Reinicie completamente o VS Code.
2. Abra a Command Palette.
3. Execute `Developer: Policy Diagnostics`.
4. Confirme que `AllowedExtensions` contém `local.codex-project-sessions` na versão `0.1.0`.

## 3. Verificar a integridade

### macOS ou Linux

```bash
shasum -a 256 -c SHA256SUMS.txt
```

### Windows PowerShell

```powershell
Get-FileHash .\codex-project-sessions-0.1.0.vsix -Algorithm SHA256
```

Compare o resultado com `SHA256SUMS.txt`.

## 4. Instalar

### Opção visual

1. Abra a Command Palette.
2. Execute `Extensions: Install from VSIX...`.
3. Selecione `codex-project-sessions-0.1.0.vsix`.

### macOS

```bash
sh install-macos.sh
```

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File .\install-windows.ps1
```

## 5. Usar

1. Abra o painel **Sessões do Codex** na barra lateral secundária à direita. Se ela estiver oculta, use **View: Toggle Secondary Side Bar**.
2. Para fixar uma pasta, clique nela com o botão direito no Explorer.
3. Selecione **Codex Sessions: Usar pasta para sessões do Codex**.
4. Clique em uma sessão para abri-la na janela do Codex.

## Diagnóstico

- Se aparecer `not in the allowed list`, a política ainda não chegou à máquina ou não contém o ID e a versão exatos.
- Se aparecer `Codex CLI não encontrado`, deixe `codexProjectSessions.codexPath` como `codex` para usar a detecção automática ou configure o caminho completo do executável.
- Logs da extensão: `View: Toggle Output` e selecione **Codex Project Sessions**.

#!/bin/sh
set -eu

script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
vsix_file="$script_dir/codex-project-sessions-0.1.0.vsix"

cd "$script_dir"
shasum -a 256 -c SHA256SUMS.txt

if command -v code >/dev/null 2>&1; then
  code_bin=$(command -v code)
elif [ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]; then
  code_bin="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
else
  printf '%s\n' "VS Code CLI não encontrado. Use Extensions: Install from VSIX..."
  exit 1
fi

if ! command -v codex >/dev/null 2>&1; then
  printf '%s\n' "Aviso: Codex CLI não foi encontrado no PATH. A extensão poderá ser instalada, mas não funcionará até ele ser configurado."
fi

if "$code_bin" --install-extension "$vsix_file" --force; then
  printf '%s\n' "Extensão instalada. Reinicie o VS Code."
else
  printf '%s\n' "A instalação falhou. Se a mensagem mencionar allowed list, solicite a entrada:"
  printf '%s\n' '"local.codex-project-sessions": ["0.1.0"]'
  exit 1
fi

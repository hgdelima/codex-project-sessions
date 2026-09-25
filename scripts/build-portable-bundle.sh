#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
version=0.1.0
bundle_name="codex-project-sessions-transfer-$version"
temporary_root=$(mktemp -d /tmp/codex-project-sessions-transfer.XXXXXX)
bundle_root="$temporary_root/$bundle_name"
source_root="$temporary_root/codex-project-sessions-source-$version"
release_root="$project_root/release"

if [ -x /opt/homebrew/bin/node ]; then
  node_bin=/opt/homebrew/bin/node
else
  node_bin=$(command -v node)
fi

cd "$project_root"
sh scripts/check.sh
"$node_bin" --test test/*.test.js
sh scripts/package-vsix.sh

mkdir -p "$bundle_root" "$source_root" "$release_root"

cp "$project_root/codex-project-sessions-$version.vsix" "$bundle_root/"
cp "$project_root/distribution/INSTALACAO.md" "$bundle_root/"
cp "$project_root/distribution/SOLICITACAO-LIBERACAO.md" "$bundle_root/"
cp "$project_root/distribution/SECURITY-REVIEW.md" "$bundle_root/"
cp "$project_root/distribution/allowed-extensions-fragment.json" "$bundle_root/"
cp "$project_root/distribution/install-macos.sh" "$bundle_root/"
cp "$project_root/distribution/install-windows.ps1" "$bundle_root/"

cp "$project_root/package.json" "$source_root/"
cp "$project_root/README.md" "$source_root/"
cp "$project_root/CHANGELOG.md" "$source_root/"
cp "$project_root/.gitignore" "$source_root/"
cp "$project_root/.vscodeignore" "$source_root/"
cp -R "$project_root/src" "$source_root/src"
cp -R "$project_root/media" "$source_root/media"
cp -R "$project_root/test" "$source_root/test"
cp -R "$project_root/scripts" "$source_root/scripts"
cp -R "$project_root/build" "$source_root/build"
cp -R "$project_root/distribution" "$source_root/distribution"

cd "$temporary_root"
/usr/bin/zip -q -r "$bundle_root/codex-project-sessions-$version-source.zip" "codex-project-sessions-source-$version"

cd "$bundle_root"
shasum -a 256 "codex-project-sessions-$version.vsix" "codex-project-sessions-$version-source.zip" > SHA256SUMS.txt
chmod 755 install-macos.sh

cd "$temporary_root"
/usr/bin/zip -q -r "$temporary_root/$bundle_name.zip" "$bundle_name"
cp "$temporary_root/$bundle_name.zip" "$release_root/$bundle_name.zip"

cd "$release_root"
shasum -a 256 "$bundle_name.zip" > "$bundle_name.zip.sha256"

printf '%s\n' "$release_root/$bundle_name.zip"

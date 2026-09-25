#!/bin/sh
set -eu

project_root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
package_root=$(mktemp -d /tmp/codex-project-sessions.XXXXXX)
extension_root="$package_root/extension"
version=$(sed -n 's/.*"version": "\([^"]*\)".*/\1/p' "$project_root/package.json" | head -1)
vsix_name="codex-project-sessions-$version.vsix"

mkdir -p "$extension_root/src" "$extension_root/media"
cp "$project_root/package.json" "$extension_root/package.json"
cp "$project_root/README.md" "$extension_root/README.md"
cp "$project_root/CHANGELOG.md" "$extension_root/CHANGELOG.md"
cp "$project_root"/src/*.js "$extension_root/src/"
cp "$project_root"/media/*.svg "$extension_root/media/"
cp "$project_root/build/extension.vsixmanifest" "$package_root/extension.vsixmanifest"
cp "$project_root/build/[Content_Types].xml" "$package_root/[Content_Types].xml"

cd "$package_root"
/usr/bin/zip -q -r "$package_root/$vsix_name" "[Content_Types].xml" extension.vsixmanifest extension
cp "$package_root/$vsix_name" "$project_root/$vsix_name"

printf '%s\n' "$project_root/$vsix_name"

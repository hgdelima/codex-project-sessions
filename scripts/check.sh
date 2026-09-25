#!/bin/sh
set -eu

if [ -x /opt/homebrew/bin/node ]; then
  node_bin=/opt/homebrew/bin/node
else
  node_bin=$(command -v node)
fi

for source_file in src/*.js test/*.js; do
  "$node_bin" --check "$source_file"
done

"$node_bin" -e 'JSON.parse(require("node:fs").readFileSync("package.json", "utf8"))'

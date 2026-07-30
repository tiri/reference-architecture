#!/usr/bin/env bash
#
# Installs the frontends as one npm workspace.
#
# The modules depend on the shared library by version ("^0.1.0"), the way they will once it
# is published — not by a path. Until there is a registry, one workspace over the
# checkouts is what makes that resolve: npm links the sibling checkout into a single
# node_modules, and every module gets the same React, which is the actual requirement (two
# copies of React in one page is a broken hook, not a duplicate dependency).
#
# The definition lives in this repo, next to everything else about the development
# environment. Only the entry point has to sit at the checkout root: node finds a package
# by walking up from the file that imports it, and dev-starter is a sibling of the modules,
# never an ancestor. So the root gets a symlink to the file here — the checkout root is not
# a repository, and nothing that matters should be kept in a place nobody reviews.
set -euo pipefail

starter="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
root="$(dirname "$starter")"
link="$root/package.json"
target="$(basename "$starter")/npm-workspace.json"

if [ -e "$link" ] && [ ! -L "$link" ]; then
    echo "$link exists and is not a link — refusing to replace it." >&2
    exit 1
fi
ln -sfn "$target" "$link"

# node_modules and package-lock.json land beside the link, outside every repository. That
# is where npm keeps the tree it installed and it cannot be moved; both are derived, and
# this script recreates them from scratch.
cd "$root"
npm install "$@"

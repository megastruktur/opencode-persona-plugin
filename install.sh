#!/usr/bin/env bash
set -euo pipefail

echo "Installing OpenCode Persona Plugin..."

# Prerequisite checks
command -v git >/dev/null 2>&1 || { echo "git is required"; exit 1; }
command -v bun >/dev/null 2>&1 || { echo "bun is required"; exit 1; }

# Define paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OPENCODE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
SOURCE_REPO_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/opencode-personas"

# Create directories
mkdir -p "$OPENCODE_CONFIG/plugins" "$OPENCODE_CONFIG/personas" "$OPENCODE_CONFIG/commands"

# Copy plugin file
cp -f "$SCRIPT_DIR/src/index.ts" "$OPENCODE_CONFIG/plugins/opencode-personas.ts"

# Copy bundled personas
for persona_file in "$SCRIPT_DIR/personas"/*.md; do
    if [ -f "$persona_file" ]; then
        cp -f "$persona_file" "$OPENCODE_CONFIG/personas/"
    fi
done

# Copy command file
cp -f "$SCRIPT_DIR/commands/persona.md" "$OPENCODE_CONFIG/commands/persona.md"

# Setup auto-update source repo
if [ ! -d "$SOURCE_REPO_DIR" ]; then
    git clone "$SCRIPT_DIR" "$SOURCE_REPO_DIR"
else
    git -C "$SOURCE_REPO_DIR" pull
fi
git -C "$SOURCE_REPO_DIR" remote set-url origin https://github.com/megastruktur/opencode-persona-plugin.git

echo ""
echo "✓ OpenCode Persona Plugin installed successfully!"
echo ""
echo "Next steps:"
echo "1. Add the plugin to your OpenCode config at: $OPENCODE_CONFIG/opencode.json"
echo "2. Add this entry to the 'plugins' array:"
echo '   { "name": "opencode-personas", "path": "plugins/opencode-personas.ts" }'
echo "3. Restart OpenCode to load the plugin"
echo ""
echo "Auto-update repository cloned to: $SOURCE_REPO_DIR"

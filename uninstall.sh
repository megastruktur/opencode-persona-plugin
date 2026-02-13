#!/usr/bin/env bash
set -euo pipefail

echo "Uninstalling OpenCode Persona Plugin..."

# Define paths
OPENCODE_CONFIG="${XDG_CONFIG_HOME:-$HOME/.config}/opencode"
SOURCE_REPO_DIR="${XDG_DATA_HOME:-$HOME/.local/share}/opencode-personas"

# Remove plugin
rm -f "$OPENCODE_CONFIG/plugins/opencode-personas.ts"

# Remove command
rm -f "$OPENCODE_CONFIG/commands/persona.md"

# Remove ONLY bundled personas
BUNDLED_PERSONAS=("strict.md" "gopnik.md")
for persona in "${BUNDLED_PERSONAS[@]}"; do
    rm -f "$OPENCODE_CONFIG/personas/$persona"
done

echo "Custom persona files in $OPENCODE_CONFIG/personas/ have been preserved."

# Remove auto-update source
rm -rf "$SOURCE_REPO_DIR"

echo ""
echo "✓ OpenCode Persona Plugin uninstalled successfully!"
echo ""
echo "Next steps:"
echo "1. Remove the plugin entry from your OpenCode config at: $OPENCODE_CONFIG/opencode.json"
echo "2. Remove this entry from the 'plugins' array:"
echo '   { "name": "opencode-personas", "path": "plugins/opencode-personas.ts" }'
echo "3. Restart OpenCode"

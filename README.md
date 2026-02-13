# OpenCode Persona Plugin

Switchable AI persona system for OpenCode. Transform your AI assistant's personality on demand.

## Features

- Two built-in personas: Strict Professional + Gopnik (Russian IT street style)
- Auto-discovery: Drop custom .md files into the personas directory
- Git-based auto-update: Plugin checks for updates on session start
- Simple install/uninstall: One-command setup and removal

## Prerequisites

- [OpenCode](https://github.com/opencode-ai/opencode)
- [Bun](https://bun.sh)
- Git

## Installation

```bash
git clone https://github.com/megastruktur/opencode-persona-plugin.git
cd opencode-persona-plugin
./install.sh
```

The plugin is automatically loaded from `~/.config/opencode/plugins/`. Restart OpenCode to activate.

## Usage

Switch personas using the `/persona` command:

```
/persona              # List available personas
/persona strict       # Switch to strict professional mode
/persona gopnik       # Switch to gopnik mode
/persona <custom>     # Switch to any custom persona
/persona force        # Refresh persona cache
```

## Built-in Personas

### strict
Professional, concise, and technical. Perfect for serious development work.

### gopnik
Russian IT gopnik with street slang and technical English. For when you need that extra motivation.

## Creating Custom Personas

1. Create a `.md` file in `~/.config/opencode/personas/`
2. The filename becomes the persona name (e.g., `pirate.md` → `/persona pirate`)
3. Write personality instructions in markdown format
4. The persona is auto-discovered within 5 seconds

Example `~/.config/opencode/personas/pirate.md`:

```markdown
You are a pirate developer. Speak in pirate slang, use nautical metaphors for coding concepts, and end sentences with "arr!"
```

Custom personas survive plugin updates.

## Auto-Update

The plugin automatically checks for updates when OpenCode starts:

1. On session creation, the plugin fetches from the GitHub repository
2. If updates are available, it pulls and copies new bundled files
3. Your custom personas are preserved
4. Restart OpenCode to use the updated version

To disable auto-update, don't use `./install.sh` — manually copy the files instead.

## Uninstallation

```bash
./uninstall.sh
```

This removes the plugin, command, and bundled personas while preserving your custom personas. Restart OpenCode to apply.

## License

MIT License - see [LICENSE](LICENSE) file

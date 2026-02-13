import type { Plugin } from "@opencode-ai/plugin"
import { readFile, readdir, stat, copyFile } from "node:fs/promises"
import { join } from "node:path"
import { homedir } from "node:os"

const PERSONAS_DIR = join(homedir(), ".config", "opencode", "personas")

// BUNDLED_PERSONAS: reserved for auto-update sync logic (Task 3), not used in discovery
const BUNDLED_PERSONAS = ["strict", "gopnik"]
const DEFAULT_PERSONA = "strict"
const DISCOVERY_CACHE_TTL = 5000

const SOURCE_REPO_DIR = join(homedir(), ".local", "share", "opencode-personas")
const PLUGIN_TARGET = join(homedir(), ".config", "opencode", "plugins", "opencode-personas.ts")
const PERSONAS_TARGET = join(homedir(), ".config", "opencode", "personas")
const COMMANDS_TARGET = join(homedir(), ".config", "opencode", "commands")

let currentPersona = ""
let personaCache = new Map<string, string>()
let discoveredPersonas: string[] = []
let lastDiscoveryTime = 0

async function discoverPersonas(): Promise<string[]> {
  try {
    const entries = await readdir(PERSONAS_DIR, { withFileTypes: true })
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name.replace(/\.md$/, ""))
      .sort()
  } catch {
    return []
  }
}

async function getAvailablePersonas(forceRefresh = false): Promise<string[]> {
  const now = Date.now()
  if (!forceRefresh && now - lastDiscoveryTime < DISCOVERY_CACHE_TTL && discoveredPersonas.length > 0) {
    return discoveredPersonas
  }
  discoveredPersonas = await discoverPersonas()
  lastDiscoveryTime = Date.now()
  return discoveredPersonas
}

async function loadPersona(name: string): Promise<string | null> {
  if (personaCache.has(name)) return personaCache.get(name)!
  try {
    const filePath = join(PERSONAS_DIR, `${name}.md`)
    const content = await readFile(filePath, "utf-8")
    if (content.trim()) {
      personaCache.set(name, content)
      return content
    }
  } catch {}
  return null
}

async function checkForUpdates(client: any): Promise<void> {
  try {
    // Check if source repo exists
    const sourceExists = await stat(SOURCE_REPO_DIR)
      .then(() => true)
      .catch(() => false)
    if (!sourceExists) return // Not installed via git clone, skip

    // Check if it's a git repo
    const gitExists = await stat(join(SOURCE_REPO_DIR, ".git"))
      .then(() => true)
      .catch(() => false)
    if (!gitExists) return

    // Fetch with timeout
    const fetchProc = Bun.spawn(["git", "-C", SOURCE_REPO_DIR, "fetch", "--quiet"])
    const fetchTimeout = setTimeout(() => fetchProc.kill(), 5000)
    await fetchProc.exited
    clearTimeout(fetchTimeout)

    // Check for changes
    const diffProc = Bun.spawn(["git", "-C", SOURCE_REPO_DIR, "diff", "HEAD..origin/main", "--stat"])
    const diffOutput = await new Response(diffProc.stdout).text()
    await diffProc.exited

    if (!diffOutput.trim()) {
      await client.app.log({
        body: { service: "opencode-personas", level: "debug", message: "No updates available" },
      })
      return
    }

    // Pull updates
    const pullProc = Bun.spawn(["git", "-C", SOURCE_REPO_DIR, "pull", "--quiet"])
    const pullTimeout = setTimeout(() => pullProc.kill(), 10000)
    await pullProc.exited
    clearTimeout(pullTimeout)

    // Copy updated bundled personas
    for (const persona of BUNDLED_PERSONAS) {
      const srcPath = join(SOURCE_REPO_DIR, "personas", `${persona}.md`)
      const destPath = join(PERSONAS_TARGET, `${persona}.md`)
      try {
        await copyFile(srcPath, destPath)
      } catch {}
    }

    // Copy updated plugin
    try {
      await copyFile(join(SOURCE_REPO_DIR, "src", "index.ts"), PLUGIN_TARGET)
    } catch {}

    // Copy updated command
    try {
      await copyFile(join(SOURCE_REPO_DIR, "commands", "persona.md"), join(COMMANDS_TARGET, "persona.md"))
    } catch {}

    await client.app.log({
      body: {
        service: "opencode-personas",
        level: "info",
        message: "Update applied. Restart OpenCode to use new version.",
      },
    })
  } catch (err) {
    await client.app.log({
      body: {
        service: "opencode-personas",
        level: "warn",
        message: "Auto-update check failed",
        extra: { error: String(err) },
      },
    })
  }
}

export const PersonasPlugin: Plugin = async ({ client }) => {
  const available = await discoverPersonas()
  discoveredPersonas = available
  lastDiscoveryTime = Date.now()

  if (available.includes(DEFAULT_PERSONA)) {
    currentPersona = DEFAULT_PERSONA
    await loadPersona(currentPersona)
  }

  await client.app.log({
    body: {
      service: "opencode-personas",
      level: "info",
      message: "Personas plugin loaded",
      extra: { default: currentPersona || "(none)", available },
    },
  })

  return {
    event: async (input) => {
      if (input.event?.type !== "session.created") return
      if (input.event?.properties?.parentID) return

      checkForUpdates(client).catch(() => {})
    },

    "experimental.chat.system.transform": async (_input, output) => {
      if (!currentPersona) return
      const content = await loadPersona(currentPersona)
      if (content) {
        output.system.push(content)
        await client.app.log({
          body: {
            service: "opencode-personas",
            level: "debug",
            message: "Persona prompt injected",
            extra: { persona: currentPersona, length: content.length },
          },
        })
      }
    },

    "command.execute.before": async (input, output) => {
      if (input.command !== "persona") return

      const requestedPersona = input.arguments?.trim().toLowerCase()

      if (requestedPersona === "force") {
        const refreshed = await getAvailablePersonas(true)
        output.parts = [
          {
            text: `[Personas] Cache refreshed. Available: ${refreshed.join(", ") || "(none)"}. Current: ${currentPersona || "(none)"}`,
          },
        ]
        return
      }

      if (!requestedPersona) {
        const personas = await getAvailablePersonas()
        output.parts = [
          {
            text: `[Personas] Available: ${personas.join(", ") || "(none)"}. Current: ${currentPersona || "(none)"}`,
          },
        ]
        return
      }

      const personas = await getAvailablePersonas()
      if (!personas.includes(requestedPersona)) {
        output.parts = [
          {
            text: `[Personas] Unknown persona "${requestedPersona}". Available: ${personas.join(", ") || "(none)"}`,
          },
        ]
        return
      }

      const oldPersona = currentPersona
      currentPersona = requestedPersona
      personaCache.delete(requestedPersona)
      await loadPersona(currentPersona)

      await client.app.log({
        body: {
          service: "opencode-personas",
          level: "info",
          message: "Persona switched",
          extra: { from: oldPersona || "(none)", to: currentPersona },
        },
      })

      output.parts = [
        {
          text: `[Personas] Switched from "${oldPersona || "(none)"}" to "${currentPersona}". All subsequent responses will use the new persona.`,
        },
      ]
    },
  }
}

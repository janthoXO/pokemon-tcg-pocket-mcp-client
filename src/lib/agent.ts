import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { WebLLMLanguageModel } from "@browser-ai/web-llm"
import {
  DirectChatTransport,
  extractReasoningMiddleware,
  isStepCount,
  ToolLoopAgent,
  type ChatTransport,
  type LanguageModel,
  type ToolSet,
  type UIMessage,
  wrapLanguageModel,
} from "ai"

import type { Settings } from "@/lib/storage"

const INSTRUCTIONS = `You help users find Pokémon TCG Pocket cards with the search_cards tool.
- For any question about cards, call search_cards in the same reply. Never say you will search without calling the tool, and never invent cards.
- Only set the fields you need. \`type\` is the energy type (Fire, Water, ...), \`category\` is Pokemon, Item, Supporter, Tool or Stadium. Game mechanics like "asleep", "heal" or "discard energy" go into \`attack\` (for attacks) or \`effect\` (for abilities and trainer cards) as a short phrase.
- Set \`language\` to the language of the user's message if the tool allows it, otherwise "en".
- If the tool returns an error, fix the arguments and call it again right away.
- Found cards are shown to the user as images below your reply, so do not list them all again. Reply briefly in the user's language.`

// one engine per page: re-downloading or re-initialising a local model is expensive
let local: WebLLMLanguageModel | undefined

async function createModel(
  s: Settings,
  onProgress: (progress: number | undefined) => void
): Promise<LanguageModel> {
  const { model, apiKey, baseURL } = s.providers[s.provider]
  switch (s.provider) {
    case "openai-compatible":
      return createOpenAICompatible({
        name: "openai-compatible",
        baseURL,
        apiKey,
      })(model)
    case "anthropic":
      return createAnthropic({
        apiKey,
        headers: { "anthropic-dangerous-direct-browser-access": "true" },
      })(model)
    case "google":
      return createGoogle({ apiKey })(model)
    case "webllm":
      if (local?.modelId !== model) {
        // lazy: WebLLM is several MB and only needed for local models
        const { webLLM } = await import("@browser-ai/web-llm")
        local = webLLM(model, {
          worker: new Worker(new URL("./webllm-worker.ts", import.meta.url), {
            type: "module",
          }),
        })
      }
      if (!local.isModelInitialized) {
        onProgress(0)
        await local
          .createSessionWithProgress(onProgress)
          .finally(() => onProgress(undefined))
      }
      // Qwen3 still emits an empty <think></think> with thinking disabled
      return wrapLanguageModel({
        model: local,
        middleware: extractReasoningMiddleware({ tagName: "think" }),
      })
  }
}

type JsonSchema = {
  enum?: unknown[]
  anyOf?: JsonSchema[]
  properties?: Record<string, JsonSchema>
  required?: string[]
}

const enumValues = (s: JsonSchema): unknown[] => [
  ...(s.enum ?? []),
  ...(s.anyOf ?? []).flatMap(enumValues),
]

/** Small models guess enum values ("fire", "English", "Pokemon" as type): fix the casing or drop the field instead of failing the call. */
export function fixEnums(input: Record<string, unknown>, schema: JsonSchema) {
  const out = { ...input }
  for (const [key, prop] of Object.entries(schema.properties ?? {})) {
    const allowed = enumValues(prop)
    const value = out[key]
    if (typeof value !== "string" || !allowed.length || allowed.includes(value))
      continue
    const match = allowed.find(
      (a) => typeof a === "string" && a.toLowerCase() === value.toLowerCase()
    )
    if (match) out[key] = match
    else if (schema.required?.includes(key)) out[key] = allowed[0]
    else delete out[key]
  }
  return out
}

let mcp: { url: string; client: Promise<MCPClient> } | undefined

async function mcpTools(url: string) {
  if (mcp?.url !== url) {
    mcp = {
      url,
      client: createMCPClient({
        // wrapper: the transport calls this.fetchFn(), and browsers reject fetch bound to a non-window `this`
        transport: { type: "http", url, fetch: (...args) => fetch(...args) },
      }),
    }
  }
  try {
    const client = await mcp.client
    const definitions = await client.listTools()
    const tools = client.toolsFromDefinitions(definitions)
    for (const { name, inputSchema } of definitions.tools) {
      const tool = tools[name]
      const execute = tool.execute
      tool.execute = (input, options) =>
        execute(
          fixEnums(input as Record<string, unknown>, inputSchema as JsonSchema),
          options
        )
    }
    return tools
  } catch (err) {
    mcp = undefined // reconnect on next message, e.g. after the server restarts
    throw new Error(
      `MCP server at ${url} unreachable: ${err instanceof Error ? err.message : err}`,
      { cause: err }
    )
  }
}

/** Runs the agent loop in the browser; settings are read per message so changes apply immediately. */
export function createTransport(
  getSettings: () => Settings,
  onProgress: (progress: number | undefined) => void
): ChatTransport<UIMessage> {
  return {
    async sendMessages(options) {
      const s = getSettings()
      const [model, tools] = await Promise.all([
        createModel(s, onProgress),
        mcpTools(s.mcpUrl),
      ])
      const agent = new ToolLoopAgent<never, ToolSet>({
        model,
        tools,
        instructions: INSTRUCTIONS,
        stopWhen: isStepCount(6),
        // Qwen3 thinks by default, which is slow in the browser and breaks JSON tool calls
        providerOptions: {
          "web-llm": { extra_body: { enable_thinking: false } },
        },
      })
      // cast: messages only differ in generic tool/data typing, not in shape
      return new DirectChatTransport({ agent }).sendMessages(options as never)
    },
    reconnectToStream: async () => null,
  }
}

import { createAnthropic } from "@ai-sdk/anthropic"
import { createGoogle } from "@ai-sdk/google"
import { createMCPClient, type MCPClient } from "@ai-sdk/mcp"
import { createOpenAICompatible } from "@ai-sdk/openai-compatible"
import type { WebLLMLanguageModel } from "@browser-ai/web-llm"
import {
  DirectChatTransport,
  isStepCount,
  ToolLoopAgent,
  type ChatTransport,
  type LanguageModel,
  type ToolSet,
  type UIMessage,
} from "ai"

import type { Settings } from "@/lib/storage"

const INSTRUCTIONS = `You help users find and understand Pokémon TCG Pocket cards.
Use the search_cards tool for every question about cards; never invent cards.
Pass the language of the user's message as \`language\` when the tool supports it, otherwise "en".
Every card the tool returns is shown to the user as an image grid right below your answer, so do not list them again. Answer in the user's language with a short summary or the specific detail they asked for.`

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
      return local
  }
}

let mcp: { url: string; client: Promise<MCPClient> } | undefined

async function mcpTools(url: string) {
  if (mcp?.url !== url) {
    mcp = { url, client: createMCPClient({ transport: { type: "http", url } }) }
  }
  try {
    return await (await mcp.client).tools()
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

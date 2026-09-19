import type { UIMessage } from "ai"

export const PROVIDERS = {
  "openai-compatible": "OpenAI-compatible",
  anthropic: "Anthropic",
  google: "Google Gemini",
  webllm: "In-browser (WebLLM)",
} as const
export type Provider = keyof typeof PROVIDERS

// curated from @mlc-ai/web-llm prebuiltAppConfig: instruct models able to follow the JSON tool-call prompt
export const WEBLLM_MODELS = {
  "Qwen3-4B-q4f16_1-MLC": "Qwen3 4B · 3.4 GB",
  "Qwen3-8B-q4f16_1-MLC": "Qwen3 8B · 5.7 GB",
  "Qwen3.5-4B-q4f16_1-MLC": "Qwen3.5 4B · 3.9 GB",
  "Qwen3-1.7B-q4f16_1-MLC": "Qwen3 1.7B · 2.0 GB (fast, less reliable)",
  "Hermes-3-Llama-3.1-8B-q4f16_1-MLC": "Hermes 3 Llama 3.1 8B · 4.9 GB",
  "Llama-3.2-3B-Instruct-q4f16_1-MLC": "Llama 3.2 3B · 2.3 GB",
}

export type ProviderConfig = { model: string; apiKey: string; baseURL: string }

export type Settings = {
  mcpUrl: string
  provider: Provider
  providers: Record<Provider, ProviderConfig>
}

export type Chat = {
  id: string
  title: string
  updatedAt: number
  messages: UIMessage[]
}

const DEFAULT_SETTINGS: Settings = {
  mcpUrl: "http://localhost:3000/mcp",
  provider: "webllm",
  providers: {
    "openai-compatible": {
      model: "gpt-5-mini",
      apiKey: "",
      baseURL: "https://api.openai.com/v1",
    },
    anthropic: { model: "claude-sonnet-5", apiKey: "", baseURL: "" },
    google: { model: "gemini-2.5-flash", apiKey: "", baseURL: "" },
    webllm: { model: "Qwen3-4B-q4f16_1-MLC", apiKey: "", baseURL: "" },
  },
}

function load<T>(key: string, fallback: T): T {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") ?? fallback
  } catch {
    return fallback
  }
}

export function loadSettings(): Settings {
  const s = load<Partial<Settings>>("settings", {})
  return {
    ...DEFAULT_SETTINGS,
    ...s,
    providers: { ...DEFAULT_SETTINGS.providers, ...s.providers },
  }
}

export const saveSettings = (s: Settings) =>
  localStorage.setItem("settings", JSON.stringify(s))

export const loadChats = () => load<Chat[]>("chats", [])

// ponytail: all chats in one localStorage key (~5 MB quota), move to IndexedDB if history outgrows it
export const saveChats = (chats: Chat[]) =>
  localStorage.setItem("chats", JSON.stringify(chats))

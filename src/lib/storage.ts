import type { UIMessage } from "ai"

export const PROVIDERS = {
  "openai-compatible": "OpenAI-compatible",
  anthropic: "Anthropic",
  google: "Google Gemini",
  webllm: "In-browser (WebLLM)",
} as const
export type Provider = keyof typeof PROVIDERS

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

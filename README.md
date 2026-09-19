# Pokémon TCG Pocket MCP Client

A browser-only chat client for the [pokemon-tcg-pocket-mcp](https://github.com/janthoXO/pokemon-tcg-pocket-mcp) server. Card results render as an image grid below each answer; click a card for a large detail view.

## How it works

- Everything runs in the browser. There is no backend besides the MCP server you point it at.
- The agent loop uses the Vercel AI SDK's `ToolLoopAgent`, talking to the MCP server over Streamable HTTP.
- Chats and settings are stored in `localStorage`.
- Card images come from the TCGdex asset URLs returned by the server's `search_cards` tool.

## Model providers

- **OpenAI-compatible, Anthropic, Google Gemini** — including OpenAI, OpenRouter, Ollama, LM Studio, and other OpenAI-compatible endpoints. API keys are kept in `localStorage` and requests go straight from the browser to the provider, so only use your own keys on your own machine.
- **In-browser (WebLLM)** — runs entirely on-device via WebGPU. The model is downloaded once and cached. Tool calls are prompt-based, so smaller models are less reliable; Qwen3 4B is the default.

Note for Ollama: its default `OLLAMA_ORIGINS` already allows localhost origins. If you serve this client from another origin, set `OLLAMA_ORIGINS` accordingly.

## Setup

1. Run the MCP server with HTTP transport and CORS enabled for this client's origin, e.g. in the server repo:

   ```sh
   TRANSPORTS=http CORS_ORIGINS=http://localhost:5173 pnpm dev
   ```

   (or set `CORS_ORIGINS` in your docker compose env). The server listens on `http://localhost:3000/mcp` by default.

2. In this repo:

   ```sh
   pnpm install
   pnpm dev
   ```

   Open `http://localhost:5173`, open Settings in the sidebar, and set the MCP URL and a model provider.

## Scripts

| Script           | What it does                        |
| ---------------- | ----------------------------------- |
| `pnpm dev`       | Start the dev server                |
| `pnpm build`     | Type-check and build for production |
| `pnpm preview`   | Preview the production build        |
| `pnpm typecheck` | Type-check without emitting         |
| `pnpm lint`      | Lint the codebase                   |
| `pnpm format`    | Format with Prettier                |

## Stack

Vite, React 19, TypeScript, Tailwind v4, shadcn/ui (Base UI), AI SDK, @ai-sdk/mcp, WebLLM via @browser-ai/web-llm.

## Disclaimer

Not affiliated with The Pokémon Company, Nintendo, Creatures, GAME FREAK or DeNA.

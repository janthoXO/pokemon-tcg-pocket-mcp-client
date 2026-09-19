import { useChat } from "@ai-sdk/react"
import {
  isToolUIPart,
  type DynamicToolUIPart,
  type ToolUIPart,
  type UIMessage,
} from "ai"
import { ArrowUp, LoaderCircle, Square } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import Markdown from "react-markdown"

import { CardGrid, type PokemonCard } from "@/components/card-grid"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"
import { createTransport } from "@/lib/agent"
import { loadSettings, type Chat } from "@/lib/storage"

const EXAMPLES = [
  "Which Fire Pokémon have the most HP?",
  "Show me cards that heal damage",
  "All Crown rare cards from Genetic Apex",
]

function ToolResult({ part }: { part: ToolUIPart | DynamicToolUIPart }) {
  if (part.state === "output-error") {
    return <p className="text-sm text-destructive">{part.errorText}</p>
  }
  if (part.state !== "output-available") {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="aspect-[367/512] rounded-lg" />
        ))}
      </div>
    )
  }
  const output = part.output as {
    isError?: boolean
    content?: { text?: string }[]
    structuredContent?: { results?: PokemonCard[] }
  }
  if (output.isError) {
    return (
      <p className="text-sm text-destructive">{output.content?.[0]?.text}</p>
    )
  }
  const cards = output.structuredContent?.results ?? []
  return cards.length ? (
    <CardGrid cards={cards} />
  ) : (
    <p className="text-sm text-muted-foreground">No cards found.</p>
  )
}

export function ChatView({
  chat,
  onMessages,
}: {
  chat: Chat
  onMessages: (messages: UIMessage[]) => void
}) {
  const [progress, setProgress] = useState<number>()
  const [transport] = useState(() => createTransport(loadSettings, setProgress))
  const { messages, sendMessage, status, stop, error } = useChat({
    id: chat.id,
    messages: chat.messages,
    transport,
  })
  const [input, setInput] = useState("")
  const bottom = useRef<HTMLDivElement>(null)
  const busy = status === "submitted" || status === "streaming"
  const lastPart = messages.at(-1)?.parts.at(-1)
  const typing = lastPart?.type === "text" && lastPart.state === "streaming"

  // persist once a turn settles, not on every streamed token
  useEffect(() => {
    if (!busy && messages.length) onMessages(messages)
  }, [busy, messages, onMessages])

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const send = (text: string) => {
    if (!text.trim() || busy) return
    void sendMessage({ text })
    setInput("")
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex max-w-3xl flex-col gap-6 p-4">
          {messages.length === 0 && (
            <div className="flex flex-col items-center gap-4 pt-[20vh] text-center">
              <h1 className="font-heading text-2xl font-semibold">
                Pokémon TCG Pocket cards
              </h1>
              <p className="text-muted-foreground">
                Ask about cards by name, type, set, rarity or effect.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {EXAMPLES.map((e) => (
                  <Button
                    key={e}
                    variant="secondary"
                    size="sm"
                    onClick={() => send(e)}
                  >
                    {e}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((m) =>
            m.role === "user" ? (
              <div
                key={m.id}
                className="max-w-[80%] self-end rounded-2xl bg-primary px-4 py-2 whitespace-pre-wrap text-primary-foreground"
              >
                {m.parts.map((p) => (p.type === "text" ? p.text : null))}
              </div>
            ) : (
              <div key={m.id} className="flex flex-col gap-3">
                {m.parts.map((p, i) =>
                  p.type === "text" ? (
                    <div
                      key={i}
                      className="leading-relaxed [&_a]:text-primary [&_a]:underline [&_code]:rounded [&_code]:bg-muted [&_code]:px-1 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:my-2 [&_ul]:list-disc [&_ul]:pl-6"
                    >
                      <Markdown>{p.text}</Markdown>
                    </div>
                  ) : isToolUIPart(p) ? (
                    <ToolResult key={i} part={p} />
                  ) : null
                )}
              </div>
            )
          )}
          {busy && !typing && progress === undefined && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoaderCircle className="size-4 animate-spin" />
              Thinking…
            </div>
          )}
          {error && (
            <Alert variant="destructive">
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>{error.message}</AlertDescription>
            </Alert>
          )}
          <div ref={bottom} />
        </div>
      </div>

      <form
        className="mx-auto flex w-full max-w-3xl flex-col gap-2 p-4 pt-0"
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
      >
        {progress !== undefined && (
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="shrink-0">
              Loading model {Math.round(progress * 100)}%
            </span>
            <Progress value={progress * 100} />
          </div>
        )}
        <div className="relative">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault()
                send(input)
              }
            }}
            placeholder="Ask about Pokémon TCG Pocket cards…"
            aria-label="Message"
            className="max-h-48 min-h-14 resize-none pr-12"
          />
          {busy ? (
            <Button
              type="button"
              size="icon"
              aria-label="Stop"
              className="absolute right-2 bottom-2"
              onClick={() => void stop()}
            >
              <Square />
            </Button>
          ) : (
            <Button
              type="submit"
              size="icon"
              aria-label="Send"
              className="absolute right-2 bottom-2"
              disabled={!input.trim()}
            >
              <ArrowUp />
            </Button>
          )}
        </div>
      </form>
    </div>
  )
}

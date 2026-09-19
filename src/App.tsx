import type { UIMessage } from "ai"
import { useCallback, useEffect, useState } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { ChatView } from "@/components/chat-view"
import { SettingsDialog } from "@/components/settings-dialog"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { TooltipProvider } from "@/components/ui/tooltip"
import {
  loadChats,
  loadSettings,
  saveChats,
  saveSettings,
  type Chat,
} from "@/lib/storage"

const newChat = (): Chat => ({
  id: crypto.randomUUID(),
  title: "New chat",
  updatedAt: Date.now(),
  messages: [],
})

function titleOf(messages: UIMessage[]) {
  const first = messages
    .find((m) => m.role === "user")
    ?.parts.find((p) => p.type === "text")
  return first?.type === "text" ? first.text.slice(0, 60) : "New chat"
}

export function App() {
  const [settings, setSettings] = useState(loadSettings)
  const [chats, setChats] = useState(loadChats)
  // the active chat only joins the list once it has messages
  const [active, setActive] = useState(newChat)
  const [settingsOpen, setSettingsOpen] = useState(false)

  useEffect(() => saveSettings(settings), [settings])
  useEffect(() => saveChats(chats), [chats])

  const onMessages = useCallback(
    (messages: UIMessage[]) =>
      setChats((all) => {
        const existing = all.find((c) => c.id === active.id)
        // reopening a chat re-reports its stored messages: don't bump it to the top
        if (existing?.messages.length === messages.length) return all
        const chat = {
          ...active,
          title: titleOf(messages),
          updatedAt: Date.now(),
          messages,
        }
        return [chat, ...all.filter((c) => c.id !== active.id)]
      }),
    [active]
  )

  const deleteChat = (id: string) => {
    setChats((all) => all.filter((c) => c.id !== id))
    if (id === active.id) setActive(newChat())
  }

  return (
    <TooltipProvider>
      <SidebarProvider>
        <AppSidebar
          chats={chats}
          activeId={active.id}
          onSelect={(id) =>
            setActive(chats.find((c) => c.id === id) ?? newChat())
          }
          onNew={() => setActive(newChat())}
          onDelete={deleteChat}
          onSettings={() => setSettingsOpen(true)}
        />
        <SidebarInset className="h-svh">
          <header className="flex h-12 shrink-0 items-center gap-2 border-b px-3">
            <SidebarTrigger />
            <span className="truncate text-sm font-medium">
              {chats.find((c) => c.id === active.id)?.title ?? active.title}
            </span>
          </header>
          <ChatView key={active.id} chat={active} onMessages={onMessages} />
        </SidebarInset>
      </SidebarProvider>
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        settings={settings}
        onSave={setSettings}
      />
    </TooltipProvider>
  )
}

export default App

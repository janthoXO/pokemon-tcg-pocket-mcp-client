import * as React from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useTheme } from "@/components/theme-provider"
import {
  PROVIDERS,
  WEBLLM_MODELS,
  type Provider,
  type ProviderConfig,
  type Settings,
} from "@/lib/storage"

const THEME_ITEMS = { light: "Light", dark: "Dark", system: "System" }

const MODEL_PLACEHOLDERS: Record<Provider, string> = {
  "openai-compatible": "gpt-5-mini",
  anthropic: "claude-sonnet-5",
  google: "gemini-2.5-flash",
  webllm: "",
}

function SettingsForm({
  settings,
  onOpenChange,
  onSave,
}: {
  settings: Settings
  onOpenChange: (open: boolean) => void
  onSave: (settings: Settings) => void
}) {
  const { theme, setTheme } = useTheme()
  const [draft, setDraft] = React.useState(settings)

  const setProvider = (patch: Partial<ProviderConfig>) =>
    setDraft((d) => ({
      ...d,
      providers: {
        ...d.providers,
        [d.provider]: { ...d.providers[d.provider], ...patch },
      },
    }))

  const providerConfig = draft.providers[draft.provider]

  return (
    <>
      <DialogHeader>
        <DialogTitle>Settings</DialogTitle>
        <DialogDescription>Stored in this browser only.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Theme</Label>
          <Select
            items={THEME_ITEMS}
            value={theme}
            onValueChange={(v) => setTheme(v as typeof theme)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(THEME_ITEMS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label htmlFor="mcp-url">MCP server URL</Label>
          <Input
            id="mcp-url"
            value={draft.mcpUrl}
            onChange={(e) =>
              setDraft((d) => ({ ...d, mcpUrl: e.target.value }))
            }
            placeholder="http://localhost:3000/mcp"
          />
          <p className="text-xs text-muted-foreground">
            Streamable HTTP endpoint. The server must allow this origin via
            CORS_ORIGINS.
          </p>
        </div>

        <div className="grid gap-2">
          <Label>Model provider</Label>
          <Select
            items={PROVIDERS}
            value={draft.provider}
            onValueChange={(v) =>
              setDraft((d) => ({ ...d, provider: v as Provider }))
            }
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROVIDERS).map(([value, label]) => (
                <SelectItem key={value} value={value}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {draft.provider === "webllm" ? (
          <div className="grid gap-4">
            {!("gpu" in navigator) && (
              <Alert variant="destructive">
                <AlertDescription>
                  WebGPU is not available in this browser.
                </AlertDescription>
              </Alert>
            )}
            <div className="grid gap-2">
              <Label>Model</Label>
              <Select
                items={WEBLLM_MODELS}
                value={providerConfig.model}
                onValueChange={(v) => setProvider({ model: v as string })}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(WEBLLM_MODELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Runs locally on WebGPU with prompt-based tool calling.
                Downloaded once on first use and cached. Qwen3 4B or larger
                recommended.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label htmlFor="model">Model</Label>
              <Input
                id="model"
                value={providerConfig.model}
                onChange={(e) => setProvider({ model: e.target.value })}
                placeholder={MODEL_PLACEHOLDERS[draft.provider]}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="api-key">API key</Label>
              <Input
                id="api-key"
                type="password"
                autoComplete="off"
                value={providerConfig.apiKey}
                onChange={(e) => setProvider({ apiKey: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Sent directly from your browser to the provider.
              </p>
            </div>
            {draft.provider === "openai-compatible" && (
              <div className="grid gap-2">
                <Label htmlFor="base-url">Base URL</Label>
                <Input
                  id="base-url"
                  value={providerConfig.baseURL}
                  onChange={(e) => setProvider({ baseURL: e.target.value })}
                  placeholder="https://api.openai.com/v1"
                />
                <p className="text-xs text-muted-foreground">
                  OpenAI, OpenRouter, Ollama (http://localhost:11434/v1), LM
                  Studio, …
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          onClick={() => {
            onSave(draft)
            onOpenChange(false)
          }}
        >
          Save
        </Button>
      </DialogFooter>
    </>
  )
}

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  settings: Settings
  onSave: (settings: Settings) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        {open && (
          <SettingsForm
            settings={settings}
            onOpenChange={onOpenChange}
            onSave={onSave}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

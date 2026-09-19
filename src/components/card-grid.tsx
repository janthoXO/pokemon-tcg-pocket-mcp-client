import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export type PokemonCard = {
  id: string // e.g. "A1-001"
  language: string
  fallbackLanguage?: string // set when card text is only available in this language
  name: string
  category: string // Pokemon | Item | Supporter | Tool | Stadium
  type: string | null // Grass, Fire, Water, Lightning, Psychic, Fighting, Darkness, Metal, Dragon, Colorless
  stage: string | null // Basic | Stage1 | Stage2
  rarity: string // OneDiamond..FourDiamond, OneStar..ThreeStar, OneShiny, TwoShiny, Crown, None
  hp: number | null
  set: { id: string; name: string }
  effect: string | null // ability/trainer text, may contain "\n"
  attacks: {
    name: string
    cost: string[]
    damage: string | null
    effect: string | null
  }[]
  image: string | null // full URL to a .webp (tcgdex assets, 600x825-ish, card aspect ~ 367/512)
  score?: number
}

const RARITY_LABELS: Record<string, string> = {
  OneDiamond: "◆",
  TwoDiamond: "◆◆",
  ThreeDiamond: "◆◆◆",
  FourDiamond: "◆◆◆◆",
  OneStar: "★",
  TwoStar: "★★",
  ThreeStar: "★★★",
  OneShiny: "✦",
  TwoShiny: "✦✦",
  Crown: "♛",
}

function rarityLabel(rarity: string): string | null {
  if (rarity === "None") return null
  return RARITY_LABELS[rarity] ?? rarity
}

function stageLabel(stage: string): string {
  return stage.replace(/^Stage(\d)$/, "Stage $1")
}

function CardThumb({
  card,
  onClick,
}: {
  card: PokemonCard
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={card.name}
      onClick={onClick}
      className="group aspect-[367/512] overflow-hidden rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {card.image ? (
        <img
          src={card.image}
          alt={card.name}
          loading="lazy"
          className="h-full w-full rounded-lg bg-muted object-cover transition group-hover:scale-[1.03]"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-lg bg-muted p-2 text-center text-xs text-muted-foreground transition group-hover:scale-[1.03]">
          {card.name}
        </div>
      )}
    </button>
  )
}

function CardDetails({ card }: { card: PokemonCard }) {
  const rarity = rarityLabel(card.rarity)
  return (
    <div className="flex flex-col gap-4">
      <div>
        <DialogTitle>{card.name}</DialogTitle>
        <DialogDescription>
          {card.set.name} {"·"} {card.id}
        </DialogDescription>
        {card.fallbackLanguage && (
          <p className="mt-1 text-xs text-muted-foreground">
            Only available in {card.fallbackLanguage}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5">
        <Badge variant="secondary">{card.category}</Badge>
        {card.type && <Badge variant="outline">{card.type}</Badge>}
        {card.stage && (
          <Badge variant="outline">{stageLabel(card.stage)}</Badge>
        )}
        {rarity && <Badge variant="outline">{rarity}</Badge>}
        {card.hp != null && <Badge variant="outline">HP {card.hp}</Badge>}
      </div>

      {card.effect && (
        <>
          <Separator />
          <p className="text-sm whitespace-pre-line">{card.effect}</p>
        </>
      )}

      {card.attacks.length > 0 && (
        <>
          <Separator />
          <div className="flex flex-col gap-3">
            {card.attacks.map((attack, i) => (
              <div key={i} className="flex flex-col gap-1">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-1">
                    {attack.cost.map((c, j) => (
                      <Badge key={j} variant="outline" className="px-1.5">
                        {c}
                      </Badge>
                    ))}
                    <span className="font-medium">{attack.name}</span>
                  </div>
                  {attack.damage && (
                    <span className="shrink-0 font-medium">
                      {attack.damage}
                    </span>
                  )}
                </div>
                {attack.effect && (
                  <p className="text-sm text-muted-foreground">
                    {attack.effect}
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export function CardGrid({ cards }: { cards: PokemonCard[] }) {
  const [selected, setSelected] = useState<PokemonCard | null>(null)

  return (
    <>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {cards.map((card) => (
          <CardThumb
            key={card.id}
            card={card}
            onClick={() => setSelected(card)}
          />
        ))}
      </div>

      <Dialog
        open={selected != null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
          {selected && (
            <div className="grid gap-4 sm:grid-cols-2">
              {selected.image ? (
                <img
                  src={selected.image}
                  alt={selected.name}
                  className="max-h-[75vh] w-auto justify-self-center rounded-xl bg-muted object-contain"
                />
              ) : (
                <div className="flex aspect-[367/512] max-h-[75vh] items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  {selected.name}
                </div>
              )}
              <CardDetails card={selected} />
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}

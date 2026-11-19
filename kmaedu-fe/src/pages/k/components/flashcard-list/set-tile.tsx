import { BookmarksIcon, BrainIcon, CardsIcon, GraduationCapIcon, LightbulbIcon, StackIcon, type Icon } from "@phosphor-icons/react"
import { DecorativeIcons } from "@/components/icons/icon-defaults"
import { stableIndex } from "@/lib/stable-index"
import { cn } from "@/lib/utils"

/** Sets carry no cover image (removed on purpose), so each one gets a fixed icon and colour picked from its id. */
const TILES: { icon: Icon; tone: string }[] = [
  { icon: CardsIcon, tone: "bg-brand-soft-hover text-brand-strong" },
  { icon: StackIcon, tone: "bg-cyan-50 text-cyan-600" },
  { icon: LightbulbIcon, tone: "bg-amber-50 text-amber-500" },
  { icon: BrainIcon, tone: "bg-indigo-50 text-indigo-600" },
  { icon: BookmarksIcon, tone: "bg-emerald-50 text-emerald-600" },
  { icon: GraduationCapIcon, tone: "bg-violet-50 text-violet-600" },
]

export function SetTile({ id, size = "md" }: { id: string; size?: "md" | "lg" }) {
  const { icon: TileIcon, tone } = TILES[stableIndex(id, TILES.length)]
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-lg",
        size === "lg" ? "size-14 [&_svg]:size-7" : "size-10 [&_svg]:size-5",
        tone,
      )}
    >
      <DecorativeIcons>
        <TileIcon />
      </DecorativeIcons>
    </span>
  )
}

import { stableIndex } from "@/lib/stable-index"
import { cn } from "@/lib/utils"
import { categoryLabel } from "./flashcard-list-logic"

const CATEGORY_TONES = [
  "bg-sky-50 text-sky-700",
  "bg-emerald-50 text-emerald-700",
  "bg-violet-50 text-violet-700",
  "bg-amber-50 text-amber-700",
  "bg-rose-50 text-rose-700",
]

const pill = "inline-flex max-w-full items-center truncate rounded-full px-2.5 py-0.5 text-xs font-medium"

/** The set's first tag as a coloured pill (same tag, same colour), "—" when the set has none. */
export function CategoryPill({ tags }: { tags: string[] }) {
  const label = categoryLabel(tags)
  if (!label) return <span className="text-muted-foreground" aria-label="Chưa có danh mục">—</span>
  return (
    <span className={cn(pill, CATEGORY_TONES[stableIndex(label, CATEGORY_TONES.length)])} title={label}>
      {label}
    </span>
  )
}

export function StatusPill({ isPublic }: { isPublic: boolean }) {
  return (
    <span className={cn(pill, isPublic ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
      {isPublic ? "Công khai" : "Riêng tư"}
    </span>
  )
}

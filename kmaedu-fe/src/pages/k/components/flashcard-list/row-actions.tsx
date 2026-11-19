import { DotsThreeIcon, GearIcon, PencilSimpleIcon, PlayIcon, ShareNetworkIcon, TrashIcon } from "@phosphor-icons/react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu"
import { cn } from "@/lib/utils"
import type { FlashcardRow, FlashcardRowHandlers } from "./flashcard-row"

const roundBtn =
  "grid size-8 shrink-0 place-items-center rounded-lg border border-hairline bg-canvas text-body transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"

/** "Chơi" pill, edit button and the ··· menu (manage cards, share, delete). */
export function RowActions({ row, handlers, className }: { row: FlashcardRow; handlers: FlashcardRowHandlers; className?: string }) {
  return (
    <div className={cn("flex shrink-0 items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={() => handlers.onPlay(row.id)}
        className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <PlayIcon weight="fill" className="size-3.5" aria-hidden />
        Chơi
        <span className="sr-only"> bộ {row.name}</span>
      </button>
      <button type="button" onClick={() => handlers.onEdit(row.id)} aria-label={`Sửa bộ ${row.name}`} className={roundBtn}>
        <PencilSimpleIcon weight="regular" className="size-4" aria-hidden />
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button type="button" aria-label={`Tùy chọn cho bộ ${row.name}`} className={roundBtn}>
            <DotsThreeIcon weight="bold" className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handlers.onManage(row.id)} className="cursor-pointer">
            <GearIcon className="mr-2 size-4" aria-hidden />
            Quản lý thẻ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onShare(row.id)} className="cursor-pointer">
            <ShareNetworkIcon className="mr-2 size-4" aria-hidden />
            Chia sẻ
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onDelete(row.id)} className="cursor-pointer text-destructive focus:text-destructive">
            <TrashIcon className="mr-2 size-4" aria-hidden />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}

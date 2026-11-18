import { PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { RichTextViewer } from "@/components/molecules/RichTextViewer";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types/flashcardSet";

interface Props {
  card: Flashcard;
  number: number;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const iconBtn =
  "grid size-8 place-items-center rounded-full text-body transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50";

/** One flashcard tile: number + label chip, question / answer and edit / delete. */
export function FlashcardGridCard({ card, number, disabled, onEdit, onDelete }: Props) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-hairline bg-canvas p-4 transition-colors duration-200 hover:border-brand-border">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="shrink-0 rounded-lg border border-hairline bg-surface-soft px-2.5 py-0.5 text-xs font-medium text-body">Thẻ {number}</span>
          {card.label && (
            <span
              className="inline-flex min-w-0 items-center gap-1 truncate rounded-lg border px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: card.label.color ? `${card.label.color}20` : undefined,
                borderColor: card.label.color || undefined,
              }}
            >
              {card.label.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: card.label.color }} />}
              {card.label.name}
            </span>
          )}
        </div>
        <div className="flex shrink-0 gap-1">
          <button type="button" onClick={onEdit} disabled={disabled} aria-label="Sửa thẻ" className={iconBtn}>
            <PencilSimpleIcon className="size-3.5" aria-hidden />
          </button>
          <button type="button" onClick={onDelete} disabled={disabled} aria-label="Xóa thẻ" className={cn(iconBtn, "text-destructive hover:text-destructive")}>
            <TrashIcon className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
      <div className="flex-1 space-y-3">
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Câu hỏi:</p>
          <div className="text-sm font-semibold text-ink">
            <RichTextViewer content={card.question} />
          </div>
        </div>
        <div>
          <p className="mb-1 text-xs text-muted-foreground">Trả lời:</p>
          <div className="text-sm text-body">
            <RichTextViewer content={card.answer} />
          </div>
        </div>
      </div>
    </div>
  );
}

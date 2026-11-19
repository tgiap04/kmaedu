import { DotsThreeVerticalIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { plainText } from "@/lib/manage-exam/quiz-set-detail";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types/flashcardSet";
import { AssignLabelPicker, type PickableLabel } from "../assign-label-picker";
import { FlashcardInlineEditor } from "./flashcard-inline-editor";

export const rowGridClass = "grid grid-cols-[32px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[32px_minmax(0,200px)_minmax(0,1fr)_150px_72px] md:gap-4";

interface Props {
  card: Flashcard;
  number: number;
  editing: boolean;
  /** Another row (or the add form) is open: actions are paused. */
  locked: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: { question: string; answer: string }) => Promise<boolean>;
  onDelete: () => void;
  /** The set's labels, offered to a card that has none. */
  labels: PickableLabel[];
  labelsUnavailable?: boolean;
  onAssignLabel: (labelId: string) => Promise<boolean>;
  onCreateLabel: (name: string) => Promise<boolean>;
}

const iconBtn = "grid size-8 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-40";

/** The label chip of a card, in the colour of its label (the brand red when the label has none). */
function LabelChip({ label }: { label: NonNullable<Flashcard["label"]> }) {
  const color = label.color ?? "var(--brand)";
  return (
    <span
      className="inline-flex max-w-full items-center truncate rounded-lg border px-2.5 py-1 text-[12px] font-medium"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
      title={label.name}
    >
      <span className="truncate">{label.name}</span>
    </span>
  );
}

/** One card: number, front, shortened back, label (or "Gán nhãn"), edit and a menu with delete; opens its editor in place. */
export function FlashcardRow({ card, number, editing, locked, onEdit, onCancelEdit, onSave, onDelete, labels, labelsUnavailable, onAssignLabel, onCreateLabel }: Props) {
  const front = plainText(card.question) || "(Mặt trước không có chữ)";
  const back = plainText(card.answer) || "(Mặt sau không có chữ)";
  const labelCell = card.label ? (
    <LabelChip label={card.label} />
  ) : (
    <AssignLabelPicker labels={labels} noun="nhãn" disabled={locked || editing} unavailable={labelsUnavailable} onAssign={onAssignLabel} onCreate={onCreateLabel} />
  );
  return (
    <li className={cn("rounded-lg border transition-colors", editing ? "border-brand-border bg-brand-soft/60" : "border-transparent hover:bg-surface-soft/60")}>
      <div className={cn(rowGridClass, "px-3 py-2.5 md:px-4")}>
        <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-[13px] font-bold text-brand">{number}</span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-semibold text-ink" title={front}>{front}</p>
          <p className="truncate text-[13px] text-body md:hidden">{back}</p>
          <div className="mt-1.5 md:hidden">{labelCell}</div>
        </div>
        <p className="hidden min-w-0 truncate text-[14px] text-body md:block" title={back}>{back}</p>
        <div className="hidden min-w-0 md:block">{labelCell}</div>
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={onEdit} disabled={locked || editing} aria-label={`Sửa thẻ ${number}`} className={cn(iconBtn, "border border-hairline text-ink hover:bg-surface-soft")}>
            <PencilSimpleIcon className="size-4" aria-hidden />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" disabled={locked} aria-label={`Thêm thao tác cho thẻ ${number}`} className={cn(iconBtn, "text-ink hover:bg-surface-soft")}>
                <DotsThreeVerticalIcon className="size-5" weight="bold" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onDelete} className="cursor-pointer text-destructive">
                <TrashIcon className="mr-2 size-4" aria-hidden />
                Xóa
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {editing && (
        <div className="px-3 pb-4 md:px-4 md:pl-[60px]">
          <FlashcardInlineEditor card={card} onSave={onSave} onCancel={onCancelEdit} />
        </div>
      )}
    </li>
  );
}

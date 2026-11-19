import { useEffect, useState } from "react";
import { PlusCircleIcon } from "@phosphor-icons/react";
import { pageOf } from "@/lib/flashcard-detail/flashcard-detail";
import { resultRange } from "@/lib/manage-exam/exam-list-view";
import { cn } from "@/lib/utils";
import type { Flashcard } from "@/types/flashcardSet";
import type { PickableLabel } from "../assign-label-picker";
import { FlashcardInlineEditor } from "./flashcard-inline-editor";
import { FlashcardPager } from "./flashcard-pager";
import { FlashcardRow, rowGridClass } from "./flashcard-row";

const PER_PAGE = 10;

interface Props {
  /** Cards after search and the label filter. */
  cards: Flashcard[];
  /** Number of each card in the whole set. */
  numberOf: (id: string) => number;
  /** Changes when search or filter change, to go back to page 1. */
  resetKey: string;
  emptyText: string;
  onAdd: (data: { question: string; answer: string }) => Promise<boolean>;
  onUpdate: (card: Flashcard, data: { question: string; answer: string }) => Promise<boolean>;
  onRequestDelete: (card: Flashcard) => void;
  /** The set's labels, in order: a card without one can be put in one from its row. */
  labels: PickableLabel[];
  /** The label list could not be read (the picker says so). */
  labelsUnavailable?: boolean;
  onAssignLabel: (card: Flashcard, labelId: string) => Promise<boolean>;
  onCreateLabel: (card: Flashcard, name: string) => Promise<boolean>;
}

/** "Danh sách thẻ": range text, rows (edit in place), the add form / button and the pager. */
export function FlashcardList({ cards, numberOf, resetKey, emptyText, onAdd, onUpdate, onRequestDelete, labels, labelsUnavailable, onAssignLabel, onCreateLabel }: Props) {
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const view = pageOf(cards, page, PER_PAGE);
  // An editor only counts while its row is on screen: paging, filtering or deleting it away closes it.
  const openEdit = editing !== null && view.rows.some((c) => c.id === editing) ? editing : null;
  const busy = openEdit !== null || adding;
  const { from, to } = resultRange(view.page, PER_PAGE, cards.length);

  const goTo = (p: number) => {
    setPage(p);
    setEditing(null);
  };
  useEffect(() => {
    setPage(1);
    setEditing(null);
  }, [resetKey]);

  return (
    <div>
      <p className="text-[14px] text-body">Hiển thị {from} – {to} trong tổng số {cards.length} thẻ</p>

      {adding && (
        <div className="mt-3 rounded-lg border border-brand-border bg-brand-soft/30 p-3 md:p-4">
          <FlashcardInlineEditor card={null} onSave={onAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {view.rows.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-body">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-0.5 rounded-lg border border-hairline-soft p-1">
          <li aria-hidden className={cn(rowGridClass, "hidden px-4 py-2 text-[12px] font-medium uppercase tracking-wide text-muted-foreground md:grid")}>
            <span>#</span>
            <span>Cụm từ</span>
            <span>Mô tả</span>
            <span>Nhãn</span>
            <span />
          </li>
          {view.rows.map((card) => (
            <FlashcardRow
              key={card.id}
              card={card}
              number={numberOf(card.id)}
              editing={openEdit === card.id}
              locked={busy && openEdit !== card.id}
              onEdit={() => {
                setEditing(card.id);
                setAdding(false);
              }}
              onCancelEdit={() => setEditing(null)}
              onSave={(data) => onUpdate(card, data)}
              onDelete={() => onRequestDelete(card)}
              labels={labels}
              labelsUnavailable={labelsUnavailable}
              onAssignLabel={(labelId) => onAssignLabel(card, labelId)}
              onCreateLabel={(name) => onCreateLabel(card, name)}
            />
          ))}
        </ul>
      )}

      {!adding && (
        <button
          type="button"
          onClick={() => {
            setAdding(true);
            setEditing(null);
          }}
          disabled={busy}
          className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-border text-[14px] font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-50"
        >
          <PlusCircleIcon className="size-4" aria-hidden />
          Thêm thẻ
        </button>
      )}

      <FlashcardPager page={view.page} totalPages={view.totalPages} onChange={goTo} />
    </div>
  );
}

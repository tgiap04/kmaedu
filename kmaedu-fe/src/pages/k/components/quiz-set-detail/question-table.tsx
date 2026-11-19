import { useEffect, useMemo, useState } from "react";
import { PlusCircleIcon } from "@phosphor-icons/react";
import { ExamTablePagination } from "@/components/organisms/k/ExamTablePagination";
import { orderLabels } from "@/lib/label-picker/label-picker";
import { toggleAll, toggleOne } from "@/lib/manage-exam/exam-list-view";
import { cn } from "@/lib/utils";
import type { Quizz, QuizSetLabel } from "@/types/quizset";
import { QuestionInlineEditor } from "./question-inline-editor";
import { QuestionTableRow, questionGridClass } from "./question-table-row";
import type { QuestionInput } from "./use-quiz-set-detail";

const PER_PAGE = 10;

interface Props {
  /** Questions after search and the chapter filter. */
  questions: Quizz[];
  /** Number of each question in the whole set. */
  numberOf: (id: string) => number;
  labels: QuizSetLabel[];
  /** Changes when search or filter change, to go back to page 1. */
  resetKey: string;
  emptyText: string;
  onAdd: (data: QuestionInput) => Promise<boolean>;
  onUpdate: (id: string, data: QuestionInput) => Promise<boolean>;
  /** Asks the page to confirm and delete. */
  onRequestDelete: (ids: string[]) => void;
  /** True while a question is being edited or added (unsaved work on the page). */
  onBusyChange?: (busy: boolean) => void;
  /** Put a question without a chapter in one, or in a chapter created for it. */
  onAssignChapter: (questionId: string, labelId: string) => Promise<boolean>;
  onCreateChapter: (questionId: string, name: string) => Promise<boolean>;
}

/** "Danh sách câu hỏi": column header, rows (expand / edit inline), add row, selection and paging footer. */
export function QuestionTable({ questions, numberOf, labels, resetKey, emptyText, onAdd, onUpdate, onRequestDelete, onBusyChange, onAssignChapter, onCreateChapter }: Props) {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const chapters = useMemo(() => orderLabels(labels), [labels]);

  const totalPages = Math.max(1, Math.ceil(questions.length / PER_PAGE));
  const rows = questions.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pageIds = rows.map((q) => q.id);
  const allOnPage = pageIds.length > 0 && pageIds.every((id) => selected.has(id));
  // An editor only counts while its row is on screen: paging, filtering or deleting it away closes it.
  const openEdit = editing !== null && rows.some((q) => q.id === editing) ? editing : null;
  const busy = openEdit !== null || adding;
  const goTo = (p: number) => {
    setPage(p);
    setEditing(null);
  };

  useEffect(() => {
    setPage(1);
    setEditing(null);
  }, [resetKey]);
  useEffect(() => onBusyChange?.(busy), [busy, onBusyChange]);
  // Leaving the question tab unmounts the table: nothing is being edited any more.
  useEffect(() => () => onBusyChange?.(false), [onBusyChange]);
  useEffect(() => setPage((p) => Math.min(p, totalPages)), [totalPages]);
  // Questions reloaded (after a save or delete): forget ids that are gone.
  const existing = useMemo(() => new Set(questions.map((q) => q.id)), [questions]);
  useEffect(() => setSelected((prev) => new Set([...prev].filter((id) => existing.has(id)))), [existing]);

  return (
    <div>
      <div className={cn(questionGridClass, "rounded-lg bg-surface-soft px-3 py-3 text-[13px] font-medium text-body md:px-4")}>
        <input type="checkbox" checked={allOnPage} onChange={() => setSelected((prev) => toggleAll(prev, pageIds))} aria-label="Chọn tất cả câu trên trang" className="size-[18px] cursor-pointer accent-[var(--brand)]" />
        <span>Câu hỏi <span className="text-muted-foreground">({questions.length} câu)</span></span>
        <span className="hidden text-center md:block">Chương</span>
        <span className="hidden text-center md:block">Loại câu hỏi</span>
        <span className="hidden md:block" />
      </div>

      {adding && (
        <div className="mt-3 rounded-lg border border-brand-border bg-brand-soft/30 p-3 md:p-4">
          <QuestionInlineEditor question={null} labels={labels} onSave={onAdd} onCancel={() => setAdding(false)} />
        </div>
      )}

      {rows.length === 0 ? (
        <p className="py-12 text-center text-[14px] text-body">{emptyText}</p>
      ) : (
        <ul className="mt-2 space-y-1">
          {rows.map((q) => (
            <QuestionTableRow
              key={q.id}
              question={q}
              number={numberOf(q.id)}
              labels={chapters}
              selected={selected.has(q.id)}
              onToggleSelect={() => setSelected((prev) => toggleOne(prev, q.id))}
              expanded={expanded === q.id}
              onToggleExpand={() => setExpanded(expanded === q.id ? null : q.id)}
              editing={openEdit === q.id}
              onEdit={() => {
                setEditing(q.id);
                setAdding(false);
              }}
              onCancelEdit={() => setEditing(null)}
              onSave={(data) => onUpdate(q.id, data)}
              onDelete={() => onRequestDelete([q.id])}
              locked={busy && openEdit !== q.id}
              onAssignChapter={(labelId) => onAssignChapter(q.id, labelId)}
              onCreateChapter={(name) => onCreateChapter(q.id, name)}
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
          className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-brand-border text-[14px] font-semibold text-brand transition-colors hover:bg-brand-soft disabled:opacity-50"
        >
          <PlusCircleIcon className="size-4" aria-hidden />
          Thêm câu hỏi
        </button>
      )}

      <div className="-mx-4 md:-mx-5">
        <ExamTablePagination
          currentPage={page}
          totalPages={totalPages}
          totalResults={questions.length}
          perPage={PER_PAGE}
          onPageChange={goTo}
          selectedCount={selected.size}
          onDeleteSelected={() => onRequestDelete([...selected])}
          unit="câu hỏi"
        />
      </div>
    </div>
  );
}

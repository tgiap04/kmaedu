import { type ReactNode, useEffect, useMemo, useState } from "react";
import { CaretCircleRightIcon, ListChecksIcon, CircleNotchIcon, MagnifyingGlassIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { PillDropdown } from "@/components/k-page/pill-dropdown";
import type { ExamChapter } from "@/lib/manage-exam/exam-chapters";
import { pageWindow } from "@/lib/manage-exam/exam-list-view";
import { type PickedQuestion, filterQuestions } from "@/lib/manage-exam/exam-question-picker";
import { quizOptionToText, resolveAnswerIndex } from "@/lib/quizAnswerUtils";
import { cn } from "@/lib/utils";
import { createCardClass } from "./create-exam-ui";

const PER_PAGE = 10;
const pageBtn = "grid size-8 place-items-center rounded-full text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-40";

interface Props {
  filename: string;
  questions: PickedQuestion[];
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  /** Chapter a ticked question sits in; undefined when not ticked. */
  chapterOf: (id: string) => string | undefined;
  /** Tick (into the active chapter) or untick these questions. */
  onPick: (questions: PickedQuestion[], on: boolean) => void;
  /** Chapters of this file, for the per-row "move to" select. */
  chapters: ExamChapter[];
  onMove: (id: string, chapterId: string) => void;
  /** Rendered under the header: the file's chapter bar. */
  chapterBar: ReactNode;
}

/** Generated questions of the opened file: search, tick into a chapter, move between chapters, see the key. */
export function SourceQuestionList({ filename, questions, loading, failed, onRetry, chapterOf, onPick, chapters, onMove, chapterBar }: Props) {
  const isPicked = (id: string) => chapterOf(id) !== undefined;
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState<string | null>(null);

  const visible = useMemo(() => filterQuestions(questions, search), [questions, search]);
  const numbers = useMemo(() => new Map(questions.map((q, i) => [q.id, i + 1])), [questions]);
  const totalPages = Math.max(1, Math.ceil(visible.length / PER_PAGE));
  const rows = visible.slice((page - 1) * PER_PAGE, page * PER_PAGE);
  const pickedVisible = visible.filter((q) => isPicked(q.id)).length;
  const allVisiblePicked = visible.length > 0 && pickedVisible === visible.length;

  // Another file: empty search, first page.
  useEffect(() => setSearch(""), [questions]);
  useEffect(() => setPage(1), [visible.length]);

  return (
    <section className={cn(createCardClass, "p-4 md:p-5")} aria-labelledby="questions-title">
      <div className="flex flex-wrap items-center gap-3 border-b border-hairline-soft pb-4">
        <ListChecksIcon className="size-5 text-brand" aria-hidden />
        <div className="min-w-0 flex-1">
          <h2 id="questions-title" className="text-base font-bold text-ink">
            Danh sách câu hỏi <span className="text-[15px] font-normal text-muted-foreground">({questions.length} câu)</span>
          </h2>
          <p className="mt-0.5 truncate text-[13px] text-body">Từ file: {filename}</p>
        </div>
        <label className="relative w-full sm:w-72">
          <span className="sr-only">Tìm kiếm câu hỏi</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm kiếm câu hỏi..."
            className="h-10 w-full rounded-lg border border-hairline bg-canvas pl-10 pr-4 text-[14px] outline-none placeholder:text-muted-soft focus:border-brand-border"
          />
        </label>
      </div>

      {chapterBar}

      {loading ? (
        <p className="flex items-center justify-center gap-2 py-10 text-[14px] text-body"><CircleNotchIcon className="size-4 animate-spin" aria-hidden />Đang tải câu hỏi...</p>
      ) : failed ? (
        <p className="py-10 text-center text-[14px] text-body">
          Không tải được Quiz của file này.{" "}
          <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">Thử lại</button>
        </p>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-body">{questions.length === 0 ? "File này chưa có câu Quiz hợp lệ." : "Không có câu hỏi nào khớp."}</p>
      ) : (
        <>
          <label className="mt-3 flex w-fit cursor-pointer items-center gap-3 py-2 text-[14px] font-medium text-ink">
            <input
              type="checkbox"
              checked={allVisiblePicked}
              onChange={() => onPick(visible, !allVisiblePicked)}
              className="size-[18px] cursor-pointer accent-[var(--brand)]"
            />
            Chọn tất cả {visible.length} câu{search.trim() ? " đang lọc" : ""}
          </label>
          <ul className="divide-y divide-hairline-soft border-t border-hairline-soft">
            {rows.map((q) => {
              const expanded = open === q.id;
              const answerIndex = resolveAnswerIndex(q.answer, q.options);
              const n = numbers.get(q.id) ?? 0;
              return (
                <li key={q.id} className="py-3">
                  <div className="flex items-center gap-4">
                    <input type="checkbox" checked={isPicked(q.id)} onChange={() => onPick([q], !isPicked(q.id))} aria-label={`Chọn câu ${n}`} className="size-[18px] shrink-0 cursor-pointer accent-[var(--brand)]" />
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[14px] font-semibold text-brand">{n}</span>
                    <button type="button" onClick={() => setOpen(expanded ? null : q.id)} aria-expanded={expanded} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                      <span className={cn("min-w-0 flex-1 text-[15px] text-ink", !expanded && "truncate")}>{q.question}</span>
                      <CaretCircleRightIcon className={cn("size-5 shrink-0 text-body transition-transform", expanded && "rotate-90")} aria-hidden />
                    </button>
                    {chapterOf(q.id) !== undefined && (
                      <PillDropdown options={chapters.map((c) => ({ value: c.id, label: c.name }))} value={chapterOf(q.id)!} onChange={(id) => onMove(q.id, id)} label={`Chương của câu ${n}`} />
                    )}
                  </div>
                  {expanded && (
                    <ol className="mt-3 grid gap-2 pl-[88px] sm:grid-cols-2">
                      {q.options.map((option, i) => (
                        <li key={i} className={cn("rounded-lg border px-3 py-2 text-[14px]", i === answerIndex ? "border-brand-border bg-brand-soft text-ink" : "border-hairline text-body")}>
                          <span className="mr-2 font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                          {quizOptionToText(option)}
                          {i === answerIndex && <span className="sr-only"> (đáp án đúng)</span>}
                        </li>
                      ))}
                    </ol>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft pt-4">
        <p className="text-[14px] text-body">Đã chọn {pickedVisible}/{visible.length} câu của file này</p>
        {totalPages > 1 && (
          <nav className="flex items-center gap-1.5" aria-label="Phân trang câu hỏi">
            <button type="button" aria-label="Trang trước" disabled={page <= 1} onClick={() => setPage(page - 1)} className={cn(pageBtn, "border border-hairline text-body hover:bg-surface-soft")}>
              <CaretLeftIcon className="size-4" aria-hidden />
            </button>
            {pageWindow(page, totalPages).map((n) => (
              <button key={n} type="button" aria-current={n === page ? "page" : undefined} onClick={() => setPage(n)} className={cn(pageBtn, n === page ? "border border-brand-border bg-brand-soft text-brand" : "text-ink hover:bg-surface-soft")}>
                {n}
              </button>
            ))}
            <button type="button" aria-label="Trang sau" disabled={page >= totalPages} onClick={() => setPage(page + 1)} className={cn(pageBtn, "text-body hover:bg-surface-soft")}>
              <CaretRightIcon className="size-4" aria-hidden />
            </button>
          </nav>
        )}
      </div>
    </section>
  );
}

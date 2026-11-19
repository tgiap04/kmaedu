import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircleIcon, ListChecksIcon, MagnifyingGlassIcon, WarningIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { Skeleton } from "@/components/antd/skeleton";
import { fold } from "@/lib/manage-exam/exam-question-picker";
import { cn } from "@/lib/utils";
import { inputClass } from "./create-flashcard-ui";
import type { LoadError, QuizSetOption } from "./use-quiz-sources";

interface Props {
  sets: QuizSetOption[];
  loading: boolean;
  error: LoadError | null;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled: boolean;
  cards: { loading: boolean; error: LoadError | null; ready: number; skipped: number; total: number; retry: () => void };
}

/** "Từ Quiz đã tạo": pick one of your quiz sets; every question becomes a card (question → correct answer). */
export function QuizSourcePanel({ sets, loading, error, onRetry, selectedId, onSelect, disabled, cards }: Props) {
  const [search, setSearch] = useState("");
  const shown = useMemo(() => {
    const needle = fold(search.trim());
    return needle ? sets.filter((s) => fold(s.title).includes(needle)) : sets;
  }, [sets, search]);

  if (loading && sets.length === 0) {
    return <div className="space-y-2">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-14 rounded-lg" />)}</div>;
  }
  if (error) {
    return (
      <div role="alert" className="flex min-h-[200px] flex-col items-center justify-center gap-2 text-center">
        <p className="text-sm font-medium text-destructive">Không tải được danh sách bộ quiz</p>
        <p className="text-[13px] text-body">{error.message}</p>
        {error.retryable && <Button variant="outline" size="sm" onClick={onRetry}>Thử lại</Button>}
      </div>
    );
  }
  if (sets.length === 0) {
    return (
      <div className="flex min-h-[200px] flex-col items-center justify-center gap-1 text-center">
        <p className="text-sm font-medium text-ink">Bạn chưa có bộ quiz nào</p>
        <p className="text-sm text-body">Tạo bộ quiz trước, rồi quay lại đây để chuyển thành flashcard.</p>
        <Link to="/k/manage-exam" className="mt-2 text-sm font-semibold text-brand hover:underline">Đến Quản lý đề thi</Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <MagnifyingGlassIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-soft" aria-hidden />
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Tìm bộ quiz theo tên" aria-label="Tìm bộ quiz" className={cn(inputClass, "pl-9")} />
      </div>
      <ul role="radiogroup" aria-label="Chọn bộ quiz" className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
        {shown.length === 0 && <li role="presentation" className="py-6 text-center text-sm text-body">Không có bộ quiz nào khớp.</li>}
        {shown.map((set) => {
          const on = set.id === selectedId;
          return (
            <li key={set.id} role="presentation">
              <button
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onSelect(set.id)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60",
                  on ? "border-brand bg-brand-soft" : "border-hairline bg-canvas hover:bg-surface-soft",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><ListChecksIcon className="size-5" aria-hidden /></span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold text-ink">{set.title}</span>
                  <span className="block text-[13px] text-body">{set.questionCount} câu hỏi</span>
                </span>
                <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", on ? "border-brand bg-brand text-white" : "border-hairline")}>
                  {on && <CheckCircleIcon className="size-5" weight="fill" aria-hidden />}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {selectedId && <CardSummary {...cards} />}
    </div>
  );
}

function CardSummary({ loading, error, ready, skipped, total, retry }: Props["cards"]) {
  if (loading) return <p role="status" className="text-[13px] text-body">Đang đọc câu hỏi của bộ quiz…</p>;
  if (error) {
    return (
      <p role="alert" className="text-[13px] text-destructive">
        Không đọc được câu hỏi của bộ quiz. {error.message}{" "}
        {error.retryable && <button type="button" onClick={retry} className="font-semibold underline">Thử lại</button>}
      </p>
    );
  }
  if (ready === 0) return <p role="status" className="text-[13px] text-destructive">Bộ quiz này chưa có câu nào dùng được để tạo thẻ.</p>;
  return (
    <div role="status" className="rounded-lg bg-surface-soft px-3.5 py-2.5 text-[13px] text-ink">
      Sẽ tạo <b className="text-ink">{ready} thẻ</b> từ {total} câu hỏi (mặt trước là câu hỏi, mặt sau là đáp án đúng).
      {skipped > 0 && (
        <span className="mt-1 flex items-start gap-1.5 text-warning">
          <WarningIcon className="mt-0.5 size-4 shrink-0" aria-hidden />
          Bỏ {skipped} câu vì không xác định được đáp án đúng.
        </span>
      )}
    </div>
  );
}

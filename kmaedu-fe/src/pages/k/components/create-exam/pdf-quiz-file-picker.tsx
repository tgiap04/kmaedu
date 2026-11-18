import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircleIcon, FileTextIcon, CircleNotchIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { fold } from "@/lib/manage-exam/exam-question-picker";
import { cn } from "@/lib/utils";
import { createCardClass } from "./create-exam-ui";
import type { QuizFile } from "./use-pdf-quiz-sources";

interface Props {
  files: QuizFile[];
  loading: boolean;
  failed: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onRetry: () => void;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** How many questions are ticked from each file, for the badge. */
  pickedByFile: Map<string, number>;
}

const formatDate = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

/** "File đã tạo Quiz": the viewer's uploads that have generated quizzes, as radio cards. */
export function PdfQuizFilePicker({ files, loading, failed, hasMore, onLoadMore, onRetry, selectedId, onSelect, pickedByFile }: Props) {
  const [search, setSearch] = useState("");
  const visible = useMemo(() => {
    const needle = fold(search.trim());
    return needle ? files.filter((f) => fold(f.filename).includes(needle)) : files;
  }, [files, search]);
  const firstLoad = loading && files.length === 0;

  return (
    <section className={cn(createCardClass, "p-4 md:p-5")} aria-labelledby="files-title">
      <div className="flex flex-wrap items-center gap-3">
        <FileTextIcon className="size-5 text-brand" aria-hidden />
        <div className="flex-1">
          <h2 id="files-title" className="text-base font-bold text-ink">
            File đã tạo Quiz {files.length > 0 && <span className="text-[15px] font-normal text-muted-foreground">({files.length} file)</span>}
          </h2>
          <p className="mt-0.5 text-[13px] text-body">Chọn file để xem các câu Quiz AI đã tạo. Có thể chọn câu từ nhiều file.</p>
        </div>
        {files.length > 3 && (
          <label className="relative w-full sm:w-64">
            <span className="sr-only">Tìm file</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Tìm theo tên file..."
              className="h-10 w-full rounded-lg border border-hairline bg-canvas pl-10 pr-4 text-[14px] outline-none placeholder:text-muted-soft focus:border-brand-border"
            />
          </label>
        )}
      </div>

      {firstLoad ? (
        <p className="flex items-center justify-center gap-2 py-10 text-[14px] text-body"><CircleNotchIcon className="size-4 animate-spin" aria-hidden />Đang tải file...</p>
      ) : failed && files.length === 0 ? (
        <p className="py-10 text-center text-[14px] text-body">
          Không tải được danh sách file.{" "}
          <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">Thử lại</button>
        </p>
      ) : files.length === 0 && !hasMore ? (
        <p className="py-10 text-center text-[14px] text-body">
          Chưa có file nào được tạo Quiz.{" "}
          <Link to="/k/ai-tool" className="font-semibold text-brand hover:underline">Tải PDF lên AI tool</Link>
          {" "}để tạo câu hỏi, rồi quay lại đây.
        </p>
      ) : (
        <>
          {visible.length === 0 ? (
            <p className="py-8 text-center text-[14px] text-body">{search ? "Không có file nào khớp." : "Chưa thấy file có Quiz trong các file đã tải."}</p>
          ) : (
            <div role="radiogroup" aria-labelledby="files-title" className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visible.map((f) => {
                const active = f.id === selectedId;
                const picked = pickedByFile.get(f.id) ?? 0;
                return (
                  <button
                    key={f.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => onSelect(f.id)}
                    className={cn(
                      "flex items-start gap-3 rounded-lg border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                      active ? "border-brand bg-brand-soft/60" : "border-hairline bg-canvas hover:border-brand-border",
                    )}
                  >
                    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
                      <FileTextIcon className="size-5" aria-hidden />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-ink" title={f.filename}>{f.filename}</span>
                      <span className="mt-1 block text-[13px] text-body">
                        {f.quizHistory.quizCount} câu Quiz • {formatDate(f.quizHistory.createdAt)}
                      </span>
                    </span>
                    {picked > 0 && (
                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[12px] font-medium text-emerald-700">
                        <CheckCircleIcon className="size-3.5" aria-hidden />
                        {picked}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {(hasMore || (failed && files.length > 0)) && (
            <div className="mt-4 text-center">
              <button
                type="button"
                onClick={failed ? onRetry : onLoadMore}
                disabled={loading}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-hairline px-5 text-[14px] font-medium text-ink hover:bg-surface-soft disabled:opacity-60"
              >
                {loading && <CircleNotchIcon className="size-4 animate-spin" aria-hidden />}
                {failed ? "Tải lại" : "Xem thêm file"}
              </button>
            </div>
          )}
        </>
      )}
    </section>
  );
}

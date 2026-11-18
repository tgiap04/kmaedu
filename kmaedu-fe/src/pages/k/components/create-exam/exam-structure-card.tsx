import { FileTextIcon, StackIcon, WarningIcon } from "@phosphor-icons/react";
import { type ExamChapter, type Picks, chapterSummary } from "@/lib/manage-exam/exam-chapters";
import { cn } from "@/lib/utils";
import { createCardClass } from "./create-exam-ui";

interface Props {
  chapters: ExamChapter[];
  picked: Picks;
  filenameOf: (fileId: string) => string;
  onOpen: (fileId: string, chapterId: string) => void;
}

/** "Cấu trúc đề": every chapter that will be created, its file and question count. */
export function ExamStructureCard({ chapters, picked, filenameOf, onOpen }: Props) {
  const rows = chapterSummary(chapters, picked).filter((r) => r.count > 0);
  if (rows.length === 0) return null;
  const hasMerge = rows.some((r) => r.merged);

  return (
    <section className={cn(createCardClass, "p-5 md:p-6")} aria-labelledby="structure-title">
      <div className="flex items-start gap-3 border-b border-hairline-soft pb-4">
        <StackIcon className="mt-0.5 size-6 text-brand" aria-hidden />
        <div>
          <h2 id="structure-title" className="text-[18px] font-bold text-ink">Cấu trúc đề</h2>
          <p className="mt-0.5 text-[13px] text-body">Mỗi chương thành một nhãn của đề thi, để phòng thi bốc câu theo chương.</p>
        </div>
      </div>
      <ol className="mt-3 divide-y divide-hairline-soft">
        {rows.map(({ chapter, count, merged }, i) => (
          <li key={chapter.id}>
            <button
              type="button"
              onClick={() => onOpen(chapter.fileId, chapter.id)}
              className="flex w-full items-center gap-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[13px] font-semibold text-brand">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: chapter.color }} aria-hidden />
                  <span className="truncate">{chapter.name}</span>
                </span>
                <span className="mt-0.5 flex items-center gap-1 truncate text-[13px] text-body">
                  <FileTextIcon className="size-3.5 shrink-0" aria-hidden />
                  {filenameOf(chapter.fileId)}
                </span>
              </span>
              {merged && (
                <span className="hidden shrink-0 items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-[12px] font-medium text-amber-700 sm:inline-flex">
                  <WarningIcon className="size-3.5" aria-hidden />
                  Trùng tên, sẽ gộp
                </span>
              )}
              <span className="shrink-0 text-[14px] font-medium tabular-nums text-ink">{count} câu</span>
            </button>
          </li>
        ))}
      </ol>
      {hasMerge && (
        <p className="mt-2 text-[13px] text-amber-700">Các chương trùng tên (không phân biệt hoa thường) sẽ thành một chương trong đề. Đổi tên nếu muốn tách riêng.</p>
      )}
    </section>
  );
}

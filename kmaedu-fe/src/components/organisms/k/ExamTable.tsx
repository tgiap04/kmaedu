import { memo, type ReactNode } from "react";
import { PlusCircleIcon } from "@phosphor-icons/react";
import { SectionMessage } from "@/components/k-page/section-card";
import { cn } from "@/lib/utils";
import type { ExamViewMode } from "./ExamSearchFilterBar";
import { ExamGridCard } from "./exam-grid-card";
import { ExamIconTile, ExamRowActions, ExamStatusPill, examSubtitle, SelectBox } from "./exam-table-parts";
import type { ExamRowHandlers, ExamTableData } from "./exam-table-parts";

export type { ExamTableData } from "./exam-table-parts";

interface ExamTableProps extends ExamRowHandlers {
  exams: ExamTableData[];
  viewMode: ExamViewMode;
  selectedIds: Set<string>;
  onToggleOne: (id: string) => void;
  onToggleAll: () => void;
  onCreate: () => void;
  /** Pagination footer, drawn inside the same card. */
  footer?: ReactNode;
}

const th = "h-14 px-3 text-[15px] font-medium text-body";
const td = "px-3 py-3 text-[15px] text-ink";

const ExamTableComponent = ({ exams, viewMode, selectedIds, onToggleOne, onToggleAll, onCreate, footer, ...handlers }: ExamTableProps) => {
  const allSelected = exams.length > 0 && exams.every((e) => selectedIds.has(e.id));

  if (exams.length === 0) {
    return (
      <div className="flex flex-col items-center rounded-lg border border-hairline-soft bg-canvas shadow-soft">
        <SectionMessage title="Không có đề thi nào" hint="Bắt đầu bằng việc tạo đề thi mới." />
        <button
          type="button"
          onClick={onCreate}
          className="mb-6 inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-4 text-[14px] font-semibold text-brand transition-colors hover:bg-brand-soft-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <PlusCircleIcon className="size-4" aria-hidden />
          Tạo đề thi
        </button>
      </div>
    );
  }

  const grid = (
    <div className={cn("grid gap-3 p-3 sm:grid-cols-2 md:p-4 xl:grid-cols-3", viewMode === "list" && "md:hidden")}>
      {exams.map((exam) => (
        <ExamGridCard key={exam.id} exam={exam} selected={selectedIds.has(exam.id)} onToggle={() => onToggleOne(exam.id)} handlers={handlers} />
      ))}
    </div>
  );

  return (
    <div className="overflow-hidden rounded-lg border border-hairline-soft bg-canvas shadow-soft">
      {grid}
      {viewMode === "list" && (
        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[860px] border-collapse text-left">
            <thead className="bg-surface-soft">
              <tr>
                <th className={cn(th, "w-14 pl-5")}>
                  <SelectBox checked={allSelected} onChange={onToggleAll} label="Chọn tất cả đề thi trên trang" />
                </th>
                <th className={th}>Tên đề thi</th>
                <th className={cn(th, "text-center")}>Trạng thái</th>
                <th className={cn(th, "text-center")}>Số câu hỏi</th>
                <th className={cn(th, "text-center")}>Học gần nhất</th>
                <th className={th}>Ngày tạo</th>
                <th className={cn(th, "pr-5 text-right")}>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {exams.map((exam) => (
                <tr key={exam.id} className="border-b border-hairline-soft transition-colors hover:bg-surface-soft/60">
                  <td className={cn(td, "pl-5")}>
                    <SelectBox checked={selectedIds.has(exam.id)} onChange={() => onToggleOne(exam.id)} label={`Chọn ${exam.name}`} />
                  </td>
                  <td className={td}>
                    <div className="flex items-center gap-3">
                      <ExamIconTile />
                      <div className="min-w-0 max-w-[300px]">
                        <p className="truncate font-semibold text-ink" title={exam.name}>{exam.name}</p>
                        <p className="truncate text-[13px] text-muted-foreground">{examSubtitle(exam)}</p>
                      </div>
                    </div>
                  </td>
                  <td className={cn(td, "text-center")}><ExamStatusPill status={exam.status} /></td>
                  <td className={cn(td, "text-center font-semibold")}>{exam.questionCount}</td>
                  <td className={cn(td, "whitespace-nowrap text-center font-semibold")}>{exam.lastStudied ?? "—"}</td>
                  <td className={cn(td, "whitespace-nowrap leading-tight")}>
                    {exam.createdDate}
                    <br />
                    <span className="text-[14px]">{exam.createdTime}</span>
                  </td>
                  <td className={cn(td, "pr-5")}><ExamRowActions exam={exam} handlers={handlers} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer && (
        <div className={cn("border-t border-hairline-soft", viewMode === "list" && "md:border-t-0")}>{footer}</div>
      )}
    </div>
  );
};

ExamTableComponent.displayName = "ExamTable";

export const ExamTable = memo(ExamTableComponent);

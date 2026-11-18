import { CalendarDotsIcon, ListChecksIcon } from "@phosphor-icons/react";
import { ExamIconTile, ExamRowActions, ExamStatusPill, examSubtitle, SelectBox } from "./exam-table-parts";
import type { ExamRowHandlers, ExamTableData } from "./exam-table-parts";

interface Props {
  exam: ExamTableData;
  selected: boolean;
  onToggle: () => void;
  handlers: ExamRowHandlers;
}

/** Grid view tile: same data and actions as a table row. */
export function ExamGridCard({ exam, selected, onToggle, handlers }: Props) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-hairline-soft bg-canvas p-4 transition-colors hover:border-brand-border">
      <div className="flex items-start gap-3">
        <ExamIconTile />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[15px] font-semibold text-ink" title={exam.name}>{exam.name}</p>
          <p className="truncate text-[13px] text-muted-foreground">{examSubtitle(exam)}</p>
        </div>
        <SelectBox checked={selected} onChange={onToggle} label={`Chọn ${exam.name}`} />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-body">
        <ExamStatusPill status={exam.status} />
        <span className="inline-flex items-center gap-1.5">
          <ListChecksIcon className="size-4 text-muted-foreground" aria-hidden />
          {exam.questionCount} câu hỏi
        </span>
        <span className="inline-flex items-center gap-1.5">
          <CalendarDotsIcon className="size-4 text-muted-foreground" aria-hidden />
          {exam.createdDate}
        </span>
      </div>
      <div className="mt-auto pt-4">
        <ExamRowActions exam={exam} handlers={handlers} />
      </div>
    </div>
  );
}

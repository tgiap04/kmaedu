import { ChevronRight, ListChecks } from "lucide-react";
import { scoreTone, type ScoreTone } from "@/lib/history/history-format";
import { cn } from "@/lib/utils";

export interface ExamHistoryListItemData {
  id: string;
  examTitle: string;
  score: number;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: string;
  passed: boolean;
}

interface ExamHistoryListItemProps {
  item: ExamHistoryListItemData;
  onClick?: (id: string) => void;
}

/** Icon tiles cycled per exam (red, blue, purple), stable for a given id. */
const ICON_TONES = [
  "bg-brand-soft text-brand",
  "bg-blue-50 text-blue-600",
  "bg-violet-50 text-violet-600",
];

const SCORE_PILL: Record<ScoreTone, string> = {
  good: "bg-emerald-50 text-emerald-700",
  fair: "bg-amber-50 text-amber-700",
  poor: "bg-brand-soft text-coral",
};

function iconTone(id: string): string {
  let sum = 0;
  for (const ch of id) sum += ch.charCodeAt(0);
  return ICON_TONES[sum % ICON_TONES.length];
}

export function ExamHistoryListItem({ item, onClick }: ExamHistoryListItemProps) {
  const percentage = item.totalQuestions > 0
    ? Math.round((item.correctAnswers / item.totalQuestions) * 100)
    : 0;
  const meta = [
    `${item.totalQuestions} câu hỏi`,
    `${item.correctAnswers}/${item.totalQuestions} câu đúng`,
    item.completedAt,
  ].join("  ·  ");

  const body = (
    <>
      <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", iconTone(item.id))}>
        <ListChecks className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-left">
        <p className="truncate text-[15px] font-semibold text-ink" title={item.examTitle}>{item.examTitle}</p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta}</p>
      </div>
      <span className={cn("shrink-0 rounded-full px-3 py-1 text-sm font-semibold", SCORE_PILL[scoreTone(percentage)])}>
        {percentage}%
      </span>
      {onClick && <ChevronRight className="size-5 shrink-0 text-muted-foreground" aria-hidden />}
    </>
  );

  const rowClass = "flex w-full items-center gap-3 py-3.5";
  return onClick ? (
    <button
      type="button"
      onClick={() => onClick(item.id)}
      className={cn(rowClass, "rounded-lg transition-colors hover:bg-surface-soft/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40")}
    >
      {body}
    </button>
  ) : (
    <div className={rowClass}>{body}</div>
  );
}

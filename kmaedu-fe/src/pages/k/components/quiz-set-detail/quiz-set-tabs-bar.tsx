import { CheckCircleIcon, CaretCircleDownIcon, FunnelIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { type LabelFilter, NO_LABEL } from "@/lib/manage-exam/quiz-set-detail";
import { cn } from "@/lib/utils";
import type { QuizSetLabel } from "@/types/quizset";

export type DetailTab = "questions" | "info" | "usage";

interface Props {
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  questionCount: number;
  search: string;
  onSearchChange: (v: string) => void;
  labels: QuizSetLabel[];
  chapter: LabelFilter;
  onChapterChange: (v: LabelFilter) => void;
}

const TABS: { key: DetailTab; label: string }[] = [
  { key: "questions", label: "Danh sách câu hỏi" },
  { key: "info", label: "Thông tin đề thi" },
  { key: "usage", label: "Lịch sử sử dụng" },
];

/** Underlined tabs; on the question tab also the search box and the chapter filter ("Bộ lọc"). */
export function QuizSetTabsBar({ tab, onTabChange, questionCount, search, onSearchChange, labels, chapter, onChapterChange }: Props) {
  const filters = [
    { value: "all", label: "Tất cả chương" },
    ...labels.map((l) => ({ value: l.id, label: l.name })),
    { value: NO_LABEL, label: "Chưa phân chương" },
  ];
  const active = filters.find((f) => f.value === chapter);

  return (
    <div className="flex flex-col gap-3 border-b border-hairline-soft lg:flex-row lg:items-end lg:justify-between">
      <div role="tablist" aria-label="Nội dung đề thi" className="-mb-px flex gap-6 overflow-x-auto">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => onTabChange(t.key)}
            className={cn(
              "shrink-0 border-b-[3px] px-1 pb-3 pt-1 text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              tab === t.key ? "border-brand font-semibold text-brand" : "border-transparent text-body hover:text-ink",
            )}
          >
            {t.label}
            {t.key === "questions" && <span className={cn("ml-1 font-normal", tab === t.key ? "text-brand/80" : "text-muted-foreground")}>({questionCount} câu)</span>}
          </button>
        ))}
      </div>

      {tab === "questions" && (
        <div className="flex items-center gap-2 pb-3">
          <label className="relative min-w-0 flex-1 lg:w-72 lg:flex-initial">
            <span className="sr-only">Tìm kiếm câu hỏi</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm câu hỏi..."
              className="h-10 w-full rounded-lg border border-hairline bg-canvas pl-10 pr-4 text-[14px] outline-none placeholder:text-muted-soft focus:border-brand-border"
            />
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-10 max-w-52 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[14px] font-medium transition-colors hover:bg-surface-soft",
                  chapter === "all" ? "border-hairline text-ink" : "border-brand-border bg-brand-soft text-brand",
                )}
              >
                <FunnelIcon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{chapter === "all" ? "Bộ lọc" : active?.label}</span>
                <CaretCircleDownIcon className="size-4 shrink-0" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filters.map((f) => (
                <DropdownMenuItem key={f.value} onClick={() => onChapterChange(f.value)} className="cursor-pointer">
                  <CheckCircleIcon className={cn("mr-2 size-4 shrink-0", f.value === chapter ? "text-brand" : "invisible")} aria-hidden />
                  <span className="max-w-64 truncate">{f.label}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

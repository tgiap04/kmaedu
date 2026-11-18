import { memo } from "react";
import { CheckCircleIcon, CaretCircleDownIcon, SquaresFourIcon, ListIcon, FunnelSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import type { FilterOption } from "@/components/molecules/FilterSelect";
import { cn } from "@/lib/utils";

export type ExamViewMode = "grid" | "list";

interface ExamSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  statusOptions: FilterOption[];
  onStatusChange: (value: string) => void;
  viewMode: ExamViewMode;
  onViewModeChange: (mode: ExamViewMode) => void;
}

const cardClass = "rounded-lg border border-hairline-soft bg-canvas p-2.5 shadow-soft";
const controlClass =
  "h-12 rounded-lg border border-hairline bg-canvas text-[15px] text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

const ExamSearchFilterBarComponent = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  statusOptions,
  onStatusChange,
  viewMode,
  onViewModeChange,
}: ExamSearchFilterBarProps) => {
  const statusLabel = statusOptions.find((o) => o.value === statusFilter)?.label ?? "Trạng thái";
  const views = [
    { mode: "grid" as const, icon: SquaresFourIcon, label: "Dạng lưới" },
    { mode: "list" as const, icon: ListIcon, label: "Dạng danh sách" },
  ];

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-stretch">
      <div className={cn(cardClass, "flex min-w-0 flex-1 flex-col gap-2.5 sm:flex-row")}>
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Tìm kiếm theo tên đề thi</span>
          <MagnifyingGlassIcon className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-muted-soft" aria-hidden />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Tìm kiếm theo tên đề thi..."
            className={cn(controlClass, "w-full pl-12 pr-4 placeholder:text-muted-soft focus-visible:border-brand-border")}
          />
        </label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button type="button" className={cn(controlClass, "inline-flex shrink-0 items-center gap-2.5 px-4 font-medium hover:bg-surface-soft")}>
              <FunnelSimpleIcon className="size-5 text-body" aria-hidden />
              {statusLabel}
              <CaretCircleDownIcon className="size-4 text-muted-foreground" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {statusOptions.map((option) => (
              <DropdownMenuItem key={option.value} onClick={() => onStatusChange(option.value)} className="cursor-pointer">
                <CheckCircleIcon className={cn("mr-2 size-4", option.value === statusFilter ? "text-brand" : "invisible")} aria-hidden />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={cn(cardClass, "flex shrink-0 items-center gap-1.5 self-start md:self-auto")} role="group" aria-label="Kiểu hiển thị">
        {views.map(({ mode, icon: Icon, label }) => (
          <button
            key={mode}
            type="button"
            onClick={() => onViewModeChange(mode)}
            aria-label={label}
            aria-pressed={viewMode === mode}
            className={cn(
              "grid size-10 place-items-center rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              viewMode === mode ? "bg-brand text-white shadow-[0_4px_12px_rgba(238,47,43,0.3)]" : "text-body hover:bg-surface-soft",
            )}
          >
            <Icon className="size-5" aria-hidden />
          </button>
        ))}
      </div>
    </div>
  );
};

ExamSearchFilterBarComponent.displayName = "ExamSearchFilterBar";

export const ExamSearchFilterBar = memo(ExamSearchFilterBarComponent);

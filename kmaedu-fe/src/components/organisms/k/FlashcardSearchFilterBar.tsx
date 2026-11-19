import { memo } from "react";
import { ArrowsDownUpIcon, FunnelSimpleIcon, ListIcon, MagnifyingGlassIcon, SquaresFourIcon } from "@phosphor-icons/react";
import { Input } from "@/components/antd/input";
import type { FilterOption } from "@/components/molecules/FilterSelect";
import { ToolbarSelect } from "@/pages/k/components/flashcard-list/toolbar-select";
import { cn } from "@/lib/utils";

export type FlashcardViewMode = "table" | "grid";

interface FlashcardSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  sortBy: string;
  statusFilter: string;
  sortOptions: FilterOption[];
  statusOptions: FilterOption[];
  onSortChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  viewMode: FlashcardViewMode;
  onViewModeChange: (mode: FlashcardViewMode) => void;
}

const viewBtn = "grid size-9 place-items-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40";

const FlashcardSearchFilterBarComponent = ({
  searchQuery,
  onSearchChange,
  sortBy,
  statusFilter,
  sortOptions,
  statusOptions,
  onSortChange,
  onStatusChange,
  viewMode,
  onViewModeChange,
}: FlashcardSearchFilterBarProps) => (
  <div className="flex flex-wrap items-center gap-2 rounded-lg border border-hairline bg-canvas p-3 shadow-[0_4px_20px_rgba(15,23,42,0.04)] md:px-4">
    <Input
      type="text"
      allowClear
      value={searchQuery}
      onChange={(e) => onSearchChange(e.target.value)}
      placeholder="Tìm kiếm bộ flashcard..."
      aria-label="Tìm kiếm bộ flashcard"
      prefix={<MagnifyingGlassIcon className="size-4 text-muted-foreground" aria-hidden />}
      className="!h-9 min-w-48 flex-1 basis-60 !bg-surface-soft/40 !py-0"
    />
    <ToolbarSelect icon={<FunnelSimpleIcon aria-hidden />} label="Lọc trạng thái" options={statusOptions} value={statusFilter} onChange={onStatusChange} />
    <ToolbarSelect icon={<ArrowsDownUpIcon aria-hidden />} label="Sắp xếp" options={sortOptions} value={sortBy} onChange={onSortChange} />
    <div role="group" aria-label="Kiểu hiển thị" className="ml-auto inline-flex overflow-hidden rounded-lg border border-hairline">
      <button
        type="button"
        aria-label="Dạng bảng"
        aria-pressed={viewMode === "table"}
        onClick={() => onViewModeChange("table")}
        className={cn(viewBtn, viewMode === "table" ? "bg-brand text-white" : "bg-canvas text-body hover:bg-surface-soft")}
      >
        <ListIcon weight="bold" className="size-4" aria-hidden />
      </button>
      <button
        type="button"
        aria-label="Dạng lưới"
        aria-pressed={viewMode === "grid"}
        onClick={() => onViewModeChange("grid")}
        className={cn(viewBtn, viewMode === "grid" ? "bg-brand text-white" : "bg-canvas text-body hover:bg-surface-soft")}
      >
        <SquaresFourIcon weight="bold" className="size-4" aria-hidden />
      </button>
    </div>
  </div>
);

FlashcardSearchFilterBarComponent.displayName = "FlashcardSearchFilterBar";

export const FlashcardSearchFilterBar = memo(FlashcardSearchFilterBarComponent);

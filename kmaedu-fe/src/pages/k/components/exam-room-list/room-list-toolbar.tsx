import { CalendarBlankIcon, MagnifyingGlassIcon, SquaresFourIcon, TableIcon } from "@phosphor-icons/react";
import { Input } from "@/components/antd/input";
import type { CreatedFilter, RoomFilters, StatusFilter } from "@/lib/exam-room/room-status";
import { ToolbarSelect } from "@/pages/k/components/flashcard-list/toolbar-select";
import { cn } from "@/lib/utils";
import type { RoomViewMode } from "./use-exam-room-list";

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "ongoing", label: "Đang diễn ra" },
  { value: "upcoming", label: "Sắp diễn ra" },
  { value: "ended", label: "Đã kết thúc" },
  { value: "empty", label: "Chưa có phiên" },
];

const CREATED_OPTIONS: { value: CreatedFilter; label: string }[] = [
  { value: "all", label: "Thời gian tạo" },
  { value: "today", label: "Tạo hôm nay" },
  { value: "7d", label: "7 ngày qua" },
  { value: "30d", label: "30 ngày qua" },
];

interface Props {
  filters: RoomFilters;
  onChange: (patch: Partial<RoomFilters>) => void;
  view: RoomViewMode;
  onViewChange: (view: RoomViewMode) => void;
}

const select = "h-11 justify-between gap-3 px-4 text-sm font-normal";
const viewBtn = "grid size-11 place-items-center rounded-lg border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function RoomListToolbar({ filters, onChange, view, onViewChange }: Props) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-hairline bg-canvas p-3 shadow-soft md:p-4">
      <Input
        type="text"
        allowClear
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Tìm kiếm phòng thi..."
        aria-label="Tìm kiếm phòng thi"
        prefix={<MagnifyingGlassIcon className="mr-1 size-[18px] text-muted-foreground" aria-hidden />}
        className="!h-11 min-w-56 flex-1 basis-72 !py-0 !text-sm"
      />
      <ToolbarSelect
        icon={null}
        label="Lọc trạng thái"
        options={STATUS_OPTIONS}
        value={filters.status}
        onChange={(v) => onChange({ status: v as StatusFilter })}
        className={cn(select, "min-w-[11.5rem]")}
      />
      <ToolbarSelect
        icon={<CalendarBlankIcon className="text-muted-foreground" aria-hidden />}
        label="Thời gian tạo"
        options={CREATED_OPTIONS}
        value={filters.created}
        onChange={(v) => onChange({ created: v as CreatedFilter })}
        className={cn(select, "min-w-[14.5rem]")}
      />
      <div role="group" aria-label="Kiểu hiển thị" className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Dạng bảng"
          aria-pressed={view === "table"}
          onClick={() => onViewChange("table")}
          className={cn(viewBtn, view === "table" ? "border-brand bg-brand text-white" : "border-hairline bg-canvas text-body hover:bg-surface-soft")}
        >
          <TableIcon weight="bold" className="size-[18px]" aria-hidden />
        </button>
        <button
          type="button"
          aria-label="Dạng lưới"
          aria-pressed={view === "grid"}
          onClick={() => onViewChange("grid")}
          className={cn(viewBtn, view === "grid" ? "border-brand bg-brand text-white" : "border-hairline bg-canvas text-body hover:bg-surface-soft")}
        >
          <SquaresFourIcon weight="bold" className="size-[18px]" aria-hidden />
        </button>
      </div>
    </div>
  );
}

import { memo } from "react";
import { SearchBar } from "@/components/molecules/SearchBar";
import {
  FilterSelect,
  FilterOption,
} from "@/components/molecules/FilterSelect";

interface ExamSearchFilterBarProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  statusOptions: FilterOption[];
  onStatusChange: (value: string) => void;
}

const ExamSearchFilterBarComponent = ({
  searchQuery,
  onSearchChange,
  statusFilter,
  statusOptions,
  onStatusChange,
}: ExamSearchFilterBarProps) => {
  return (
    <div className="flex flex-col items-stretch justify-between gap-3 rounded-[20px] border border-hairline bg-canvas p-3 shadow-[0_4px_20px_rgba(15,23,42,0.04)] md:flex-row md:items-center md:px-5 [&>div:first-child]:min-w-0 [&>div:first-child]:max-w-none [&>div:first-child]:md:max-w-md">
      <SearchBar
        value={searchQuery}
        onChange={onSearchChange}
        placeholder="Tìm kiếm đề thi..."
      />
      <div className="flex flex-wrap items-center gap-2">
        <FilterSelect
          value={statusFilter}
          options={statusOptions}
          placeholder="Trạng thái"
          onValueChange={onStatusChange}
          className="w-fit"
        />
      </div>
    </div>
  );
};

ExamSearchFilterBarComponent.displayName = "ExamSearchFilterBar";

export const ExamSearchFilterBar = memo(ExamSearchFilterBarComponent);

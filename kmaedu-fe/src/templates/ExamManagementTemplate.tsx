import { useEffect, useState } from "react";
import { ExamManagementHeader } from "@/components/organisms/k/ExamManagementHeader";
import { ExamStatsSection, type ExamStatsData } from "@/components/organisms/k/ExamStatsSection";
import { ExamSearchFilterBar, type ExamViewMode } from "@/components/organisms/k/ExamSearchFilterBar";
import { ExamTable, type ExamTableData } from "@/components/organisms/k/ExamTable";
import { ExamTablePagination } from "@/components/organisms/k/ExamTablePagination";
import type { FilterOption } from "@/components/molecules/FilterSelect";
import { toggleAll, toggleOne } from "@/lib/manage-exam/exam-list-view";

interface ExamManagementTemplateProps {
  stats: ExamStatsData;
  exams: ExamTableData[];
  searchQuery: string;
  statusFilter: string;
  statusOptions: FilterOption[];
  currentPage: number;
  totalPages: number;
  totalResults: number;
  perPage: number;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onCreateExam: () => void;
  onViewExam: (id: string) => void;
  onEditExam: (id: string) => void;
  onDeleteExam: (id: string) => void;
  onDeleteExams: (ids: string[]) => void;
  onPageChange: (page: number) => void;
}

export function ExamManagementTemplate({
  stats,
  exams,
  searchQuery,
  statusFilter,
  statusOptions,
  currentPage,
  totalPages,
  totalResults,
  perPage,
  onSearchChange,
  onStatusChange,
  onCreateExam,
  onViewExam,
  onEditExam,
  onDeleteExam,
  onDeleteExams,
  onPageChange,
}: ExamManagementTemplateProps) {
  const [viewMode, setViewMode] = useState<ExamViewMode>("list");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  // A new page, filter or a deletion replaces the rows: drop selections that are no longer visible.
  useEffect(() => {
    setSelectedIds(new Set());
  }, [exams]);

  return (
    <div className="min-w-0 pt-2">
      <div className="flex flex-col gap-5 [&>header]:mb-2">
        <ExamManagementHeader onCreateExam={onCreateExam} />

        <ExamStatsSection stats={stats} />

        <ExamSearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          statusFilter={statusFilter}
          statusOptions={statusOptions}
          onStatusChange={onStatusChange}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
        />

        <ExamTable
          exams={exams}
          viewMode={viewMode}
          selectedIds={selectedIds}
          onToggleOne={(id) => setSelectedIds((prev) => toggleOne(prev, id))}
          onToggleAll={() => setSelectedIds((prev) => toggleAll(prev, exams.map((e) => e.id)))}
          onView={onViewExam}
          onEdit={onEditExam}
          onDelete={onDeleteExam}
          onCreate={onCreateExam}
          footer={
            totalResults > 0 && (
              <ExamTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                perPage={perPage}
                onPageChange={onPageChange}
                selectedCount={selectedIds.size}
                onDeleteSelected={() => onDeleteExams([...selectedIds])}
              />
            )
          }
        />
      </div>
    </div>
  );
}

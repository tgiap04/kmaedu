import { HistoryStatsGrid } from "@/components/organisms/k/HistoryStatsGrid";
import { PDFHistoryListSection } from "@/components/organisms/k/PDFHistoryListSection";
import { ExamHistoryListSection } from "@/components/organisms/k/ExamHistoryListSection";
import { RecentActivitySection } from "@/components/organisms/k/RecentActivitySection";
import type { PDFHistoryListItemData } from "@/components/molecules/PDFHistoryListItem";
import type { ExamHistoryListItemData } from "@/components/molecules/ExamHistoryListItem";
import type { RecentActivityItemData } from "@/components/molecules/RecentActivityItem";

interface HistoryStats {
  totalPDFs: number;
  examsCreated: number;
  flashcardSets: number;
  totalStudyHours: number;
}

interface HistoryTemplateProps {
  stats: HistoryStats;
  pdfItems: PDFHistoryListItemData[];
  examItems: ExamHistoryListItemData[];
  activities: RecentActivityItemData[];
  onPdfDownload?: (id: string) => void;
  onPdfDelete?: (id: string) => void;
  onExamClick?: (id: string) => void;
  showPdfHistory?: boolean;
  showExamHistory?: boolean;
  showStats?: boolean;
}

export function HistoryTemplate({
  stats,
  pdfItems,
  examItems,
  activities,
  onPdfDownload,
  onPdfDelete,
  onExamClick,
  showPdfHistory = true,
  showExamHistory = true,
  showStats = true,
}: HistoryTemplateProps) {
  const twoColumns = showPdfHistory && showExamHistory;

  return (
    <div className="space-y-4">
      <header className="mt-2 flex items-center gap-4">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft shadow-soft">
          <img src="/illustrations/learning-books-cap.svg" alt="" aria-hidden width={32} height={32} className="size-8" />
        </span>
        <div className="min-w-0">
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink sm:text-[28px]">Quản lý học tập</h1>
          <p className="mt-1 text-sm text-muted-foreground sm:text-base">
            Theo dõi tiến độ và hoạt động học tập của bạn
          </p>
        </div>
      </header>

      {showStats && <HistoryStatsGrid stats={stats} />}

      <RecentActivitySection
        activities={activities}
        viewAllTo={showExamHistory ? "/k/my-exams" : showPdfHistory ? "/k/history/pdf" : undefined}
      />

      <div className={`grid gap-4 ${twoColumns ? "lg:grid-cols-2" : "lg:grid-cols-1"}`}>
        {showPdfHistory && (
          <PDFHistoryListSection
            items={pdfItems}
            onDownload={onPdfDownload}
            onDelete={onPdfDelete}
          />
        )}
        {showExamHistory && (
          <ExamHistoryListSection
            items={examItems}
            onClick={onExamClick}
          />
        )}
      </div>
    </div>
  );
}

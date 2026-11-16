import { memo } from "react";
import { BookOpen, ClipboardList, Clock, FileText } from "lucide-react";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";
import { useCan } from "@/hooks/useCan";

interface HistoryStats {
  totalPDFs: number;
  examsCreated: number;
  flashcardSets: number;
  totalStudyHours: number;
}

interface HistoryStatsGridProps {
  stats: HistoryStats;
}

const HistoryStatsGridComponent = ({ stats }: HistoryStatsGridProps) => {
  // An arrow only points at a page the viewer may open.
  const canPdf = useCan("ai:generate");
  const canManageExam = useCan("quizset:manage");
  const canStudyFlashcards = useCan("flashcard:study");

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <HistoryStatCard
        title="Tổng PDF đã xử lý"
        value={stats.totalPDFs}
        icon={FileText}
        tone="red"
        to={canPdf ? "/k/history/pdf" : undefined}
      />
      <HistoryStatCard
        title="Đề thi đã tạo"
        value={stats.examsCreated}
        icon={ClipboardList}
        tone="amber"
        to={canManageExam ? "/k/manage-exam" : undefined}
      />
      <HistoryStatCard
        title="Bộ Flashcard"
        value={stats.flashcardSets}
        icon={BookOpen}
        tone="green"
        to={canStudyFlashcards ? "/k/my-materials" : undefined}
      />
      <HistoryStatCard
        title="Giờ học tổng cộng"
        value={stats.totalStudyHours}
        icon={Clock}
        tone="blue"
      />
    </div>
  );
};

HistoryStatsGridComponent.displayName = "HistoryStatsGrid";

export const HistoryStatsGrid = memo(HistoryStatsGridComponent);

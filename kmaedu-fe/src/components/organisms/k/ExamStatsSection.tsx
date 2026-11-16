import { memo } from "react";
import { FileText, CheckCircle, HelpCircle } from "lucide-react";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";

interface ExamStatsData {
  totalExams: number;
  totalExamsTrend: number;
  activeExams: number;
  activeExamsTrend: number;
  totalQuestions: number;
  totalQuestionsTrend: number;
  completionRate: number;
  completionRateTrend: number;
}

interface ExamStatsSectionProps {
  stats: ExamStatsData;
}

const ExamStatsSectionComponent = ({ stats }: ExamStatsSectionProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <HistoryStatCard
        title="Tổng số đề"
        value={stats.totalExams}
        icon={FileText}
        tone="red"
      />
      <HistoryStatCard
        title="Đề đang hoạt động"
        value={stats.activeExams}
        icon={CheckCircle}
        tone="green"
      />
      <HistoryStatCard
        title="Tổng câu hỏi"
        value={stats.totalQuestions}
        icon={HelpCircle}
        tone="amber"
      />
    </div>
  );
};

ExamStatsSectionComponent.displayName = "ExamStatsSection";

export const ExamStatsSection = memo(ExamStatsSectionComponent);

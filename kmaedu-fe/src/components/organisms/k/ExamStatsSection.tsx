import { memo } from "react";
import { ListChecksIcon, LockSimpleIcon, ExamIcon, GlobeIcon } from "@phosphor-icons/react";
import { ExamOverviewStatCard } from "./exam-overview-stat-card";

export interface ExamStatsData {
  totalExams: number;
  publicExams: number;
  totalQuestions: number;
  privateExams: number;
}

interface ExamStatsSectionProps {
  stats: ExamStatsData;
}

const ExamStatsSectionComponent = ({ stats }: ExamStatsSectionProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ExamOverviewStatCard title="Tổng số đề thi" value={stats.totalExams} icon={ExamIcon} tone="red" />
      <ExamOverviewStatCard title="Đề công khai" value={stats.publicExams} icon={GlobeIcon} tone="green" />
      <ExamOverviewStatCard title="Tổng câu hỏi" value={stats.totalQuestions} icon={ListChecksIcon} tone="amber" />
      <ExamOverviewStatCard title="Đề riêng tư" value={stats.privateExams} icon={LockSimpleIcon} tone="violet" />
    </div>
  );
};

ExamStatsSectionComponent.displayName = "ExamStatsSection";

export const ExamStatsSection = memo(ExamStatsSectionComponent);

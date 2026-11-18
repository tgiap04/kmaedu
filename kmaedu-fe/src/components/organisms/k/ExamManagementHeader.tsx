import { memo } from "react";
import { ExamIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";

interface ExamManagementHeaderProps {
  onCreateExam: () => void;
}

const ExamManagementHeaderComponent = ({
  onCreateExam,
}: ExamManagementHeaderProps) => {
  return (
    <PageHeader
      icon={<ExamIcon />}
      title="Quản lý đề thi"
      subtitle="Tạo, chỉnh sửa và quản lý các đề thi của bạn"
      actions={
        <button
          type="button"
          onClick={onCreateExam}
          className="inline-flex h-12 items-center gap-2 rounded-lg bg-brand px-7 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(238,47,43,0.25)] transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
        >
          <PlusCircleIcon className="size-5" aria-hidden />
          Tạo đề thi
        </button>
      }
    />
  );
};

ExamManagementHeaderComponent.displayName = "ExamManagementHeader";

export const ExamManagementHeader = memo(ExamManagementHeaderComponent);

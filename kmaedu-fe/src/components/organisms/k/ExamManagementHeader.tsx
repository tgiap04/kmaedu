import { memo } from "react";
import { FileText, Plus } from "lucide-react";
import { PageHeader } from "@/components/k-page/page-header";

interface ExamManagementHeaderProps {
  onCreateExam: () => void;
}

const ExamManagementHeaderComponent = ({
  onCreateExam,
}: ExamManagementHeaderProps) => {
  return (
    <PageHeader
      icon={<FileText />}
      title="Quản lý đề thi"
      subtitle="Tạo, chỉnh sửa và quản lý các đề thi và câu hỏi của bạn"
      actions={
        <button
          type="button"
          onClick={onCreateExam}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden />
          Tạo đề thi
        </button>
      }
    />
  );
};

ExamManagementHeaderComponent.displayName = "ExamManagementHeader";

export const ExamManagementHeader = memo(ExamManagementHeaderComponent);

import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, History, Link2, Play } from "lucide-react";
import { useToast } from "@/components/antd/toast";
import { lastAttemptLabel } from "@/lib/quiz-practice/last-attempt-label";
import { displayUserName } from "@/lib/user/display-user-name";
import { useQuizPracticeStore } from "@/stores/useQuizPracticeStore";
import { MaterialRow } from "../my-materials/material-row";
import { MaterialMessage, MaterialRowsSkeleton, MaterialSectionCard, SectionPager, ViewAllButton } from "../my-materials/material-section-card";
import { usePagedList } from "../my-materials/use-paged-list";

const PAGE_SIZE = 6;
const PREVIEW = 2;

/** "Bộ câu hỏi được chia sẻ": the sets granted to me (whitelist or code), with a practice button. */
export function SharedQuizSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fetchSets = useQuizPracticeStore((s) => s.fetchSets);
  const fetchPage = useCallback((page: number) => fetchSets(page, PAGE_SIZE), [fetchSets]);
  const { page, setPage, data, failed, reload } = usePagedList(fetchPage);
  const [expanded, setExpanded] = useState(false);

  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/k/practice-quiz/${id}`);
      toast.success("Đã sao chép liên kết");
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const sets = data ? (expanded ? data.sets : data.sets.slice(0, PREVIEW)) : [];
  const canExpand = !!data && data.total > PREVIEW;

  return (
    <MaterialSectionCard
      icon={<FileText />}
      title="Bộ câu hỏi được chia sẻ"
      countLabel={data ? `${data.total} bộ câu hỏi` : undefined}
      action={canExpand ? <ViewAllButton expanded={expanded} onToggle={() => { setExpanded(!expanded); setPage(1); }} /> : undefined}
      illustration="/illustrations/materials-quiz.svg"
    >
      {failed ? (
        <MaterialMessage title="Không thể tải bộ câu hỏi được chia sẻ" onRetry={reload} />
      ) : data === null ? (
        <MaterialRowsSkeleton />
      ) : data.sets.length === 0 ? (
        <MaterialMessage title="Chưa có bộ câu hỏi nào được chia sẻ" hint="Mở liên kết và nhập mã giáo viên gửi để thêm vào đây" />
      ) : (
        <>
          {sets.map((set, index) => (
            <MaterialRow
              key={set.id}
              icon={<FileText />}
              tone={index % 2 === 0 ? "cyan" : "amber"}
              title={set.title}
              meta={[`${set.questionCount} câu hỏi`, `Chia sẻ bởi ${displayUserName(set.owner, "Ẩn danh")}`]}
              metric={
                <>
                  <History aria-hidden />
                  {lastAttemptLabel(set.lastAttempt) ?? "Chưa luyện tập"}
                </>
              }
              action={{ label: "Luyện tập", icon: Play, onClick: () => navigate(`/k/practice-quiz/${set.id}`) }}
              menu={[{ label: "Sao chép liên kết", icon: Link2, onClick: () => void copyLink(set.id) }]}
            />
          ))}
          {expanded && <SectionPager page={page} totalPages={data.totalPages} onChange={setPage} />}
        </>
      )}
    </MaterialSectionCard>
  );
}

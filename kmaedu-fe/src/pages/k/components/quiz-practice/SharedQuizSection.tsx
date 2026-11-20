import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { FileTextIcon, ClockCounterClockwiseIcon, PlayIcon } from "@phosphor-icons/react";
import { lastAttemptLabel } from "@/lib/quiz-practice/last-attempt-label";
import { displayUserName } from "@/lib/user/display-user-name";
import { useQuizPracticeStore } from "@/stores/useQuizPracticeStore";
import { ItemRow } from "@/components/k-page/item-row";
import { SectionMessage, RowsSkeleton, SectionCard, SectionPager } from "@/components/k-page/section-card";
import { usePagedList } from "../my-materials/use-paged-list";

const PAGE_SIZE = 5;

/**
 * "Bộ câu hỏi luyện tập": sets a teacher opened to me (invited, unlocked with their code, or public ones I
 * already practised), with a practice button. A learner cannot share them on: access is the teacher's call.
 */
export function SharedQuizSection() {
  const navigate = useNavigate();
  const fetchSets = useQuizPracticeStore((s) => s.fetchSets);
  const fetchPage = useCallback((page: number) => fetchSets(page, PAGE_SIZE), [fetchSets]);
  const { page, setPage, data, failed, reload } = usePagedList(fetchPage);

  const sets = data?.sets ?? [];

  return (
    <SectionCard
      icon={<FileTextIcon />}
      title="Bộ câu hỏi luyện tập"
      subtitle="Bộ câu hỏi giáo viên mở cho bạn luyện tập"
      countLabel={data ? `${data.total} bộ câu hỏi` : undefined}
      illustration="/illustrations/materials-quiz.svg"
    >
      {failed ? (
        <SectionMessage title="Không thể tải bộ câu hỏi luyện tập" onRetry={reload} />
      ) : data === null ? (
        <RowsSkeleton />
      ) : data.sets.length === 0 ? (
        <SectionMessage title="Chưa có bộ câu hỏi nào" hint="Mở liên kết luyện tập giáo viên gửi (nhập mã nếu được yêu cầu), bộ câu hỏi sẽ hiện ở đây" />
      ) : (
        <>
          {sets.map((set, index) => (
            <ItemRow
              key={set.id}
              icon={<FileTextIcon />}
              tone={index % 2 === 0 ? "cyan" : "amber"}
              title={set.title}
              meta={[`${set.questionCount} câu hỏi`, `Giáo viên: ${displayUserName(set.owner, "Ẩn danh")}`]}
              metric={
                <>
                  <ClockCounterClockwiseIcon aria-hidden />
                  {lastAttemptLabel(set.lastAttempt) ?? "Chưa luyện tập"}
                </>
              }
              action={{ label: "Luyện tập", icon: PlayIcon, onClick: () => navigate(`/k/practice-quiz/${set.id}`) }}
            />
          ))}
          <SectionPager page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </SectionCard>
  );
}

import { ClockCounterClockwiseIcon, EyeIcon } from "@phosphor-icons/react";
import { ItemRow } from "@/components/k-page/item-row";
import { RowsSkeleton, SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { formatDuration } from "@/lib/quiz-practice/progress";
import type { AttemptHistoryItem } from "@/apis/quizPracticeApi";

interface PracticeHistoryProps {
  attempts: AttemptHistoryItem[] | null;
  error: boolean;
  onOpen: (attemptId: string) => void;
  onRetry: () => void;
}

export function PracticeHistory({ attempts, error, onOpen, onRetry }: PracticeHistoryProps) {
  return (
    <SectionCard icon={<ClockCounterClockwiseIcon />} title="Lịch sử luyện tập" countLabel={attempts?.length ? `${attempts.length} lượt` : undefined}>
      {error ? (
        <SectionMessage title="Không thể tải lịch sử luyện tập" onRetry={onRetry} />
      ) : attempts === null ? (
        <RowsSkeleton rows={3} />
      ) : attempts.length === 0 ? (
        <SectionMessage title="Bạn chưa nộp bài luyện tập nào." />
      ) : (
        attempts.map((a) => (
          <ItemRow
            key={a.id}
            icon={<ClockCounterClockwiseIcon />}
            tone="indigo"
            title={`${a.score ?? 0}/10 · đúng ${a.correctAnswers}/${a.totalQuestions}`}
            meta={[a.submittedAt ? new Date(a.submittedAt).toLocaleString("vi-VN") : "", formatDuration(a.timeSpentSeconds)]}
            action={{ label: "Xem lại", icon: EyeIcon, onClick: () => onOpen(a.id), variant: "neutral" }}
          />
        ))
      )}
    </SectionCard>
  );
}

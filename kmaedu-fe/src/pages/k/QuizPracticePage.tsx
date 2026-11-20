import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CaretRightIcon, BarbellIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import { RowsSkeleton, SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { listAttemptsApi, type AttemptHistoryItem } from "@/apis/quizPracticeApi";
import { unansweredCount } from "@/lib/quiz-practice/progress";
import { AccessCodeForm } from "./components/quiz-practice/AccessCodeForm";
import { PracticeIntroCard } from "./components/quiz-practice/practice-intro-card";
import { PracticeQuizView } from "./components/quiz-practice/practice-quiz-view";
import { PracticeHistory } from "./components/quiz-practice/PracticeHistory";
import { PracticeResultView } from "./components/quiz-practice/practice-result-view";
import { usePracticeSession } from "./components/quiz-practice/usePracticeSession";

export default function QuizPracticePage() {
  const { id = "" } = useParams();
  const s = usePracticeSession(id);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [history, setHistory] = useState<AttemptHistoryItem[] | null>(null);
  const [historyError, setHistoryError] = useState(false);

  const loadHistory = useCallback(() => {
    setHistoryError(false);
    listAttemptsApi({ quizSetId: id, limit: 20 })
      .then((r) => setHistory(r.attempts))
      .catch(() => setHistoryError(true));
  }, [id]);

  useEffect(() => {
    if (s.phase === "intro" || s.phase === "result") loadHistory();
  }, [s.phase, loadHistory]);

  const title = s.access?.title ?? "Luyện tập";

  return (
    <div className="space-y-4">
      <PageHeader
        icon={<BarbellIcon />}
        title={title}
        subtitle="Luyện tập trắc nghiệm, đáp án hiện sau khi bạn nộp bài"
        eyebrow={
          <nav aria-label="Đường dẫn" className="flex items-center gap-1.5 text-sm">
            <Link to="/k/my-materials" className="font-medium text-body transition-colors hover:text-brand-strong">Tài liệu của tôi</Link>
            <CaretRightIcon weight="bold" className="size-3 text-muted-foreground" aria-hidden />
            <span aria-current="page" className="max-w-[60vw] truncate font-semibold text-ink">{title}</span>
          </nav>
        }
      />

      {s.phase === "loading" && (
        <SectionCard icon={<BarbellIcon />} title="Đang tải bộ câu hỏi">
          <RowsSkeleton rows={3} />
        </SectionCard>
      )}

      {s.phase === "unavailable" && (
        <SectionCard icon={<BarbellIcon />} title="Luyện tập">
          <SectionMessage title={s.problem ?? "Bộ câu hỏi không tồn tại hoặc bạn chưa được cấp quyền truy cập."} />
        </SectionCard>
      )}

      {s.phase === "code" && (
        <AccessCodeForm title={title} submitting={s.busy} error={s.problem} locked={s.locked} onSubmit={s.unlock} />
      )}

      {s.phase === "intro" && (
        <PracticeIntroCard
          questionCount={s.access?.questionCount ?? 0}
          busy={s.busy}
          problem={s.problem}
          onStart={s.start}
          history={<PracticeHistory attempts={history} error={historyError} onOpen={s.openAttempt} onRetry={loadHistory} />}
        />
      )}

      {s.phase === "practice" && (
        <PracticeQuizView
          questions={s.questions}
          currentIndex={s.progress.currentIndex}
          answers={s.progress.answers}
          marked={s.progress.markedQuestions}
          busy={s.busy}
          problem={s.problem}
          keysEnabled={!confirmSubmit}
          onGo={s.go}
          onSelect={s.select}
          onToggleMark={s.mark}
          onSubmit={() => setConfirmSubmit(true)}
        />
      )}

      {s.phase === "result" && s.result && (
        <div className="space-y-4">
          <PracticeResultView key={s.result.attempt.id} result={s.result} onPracticeAgain={s.backToIntro} />
          <PracticeHistory attempts={history} error={historyError} onOpen={s.openAttempt} onRetry={loadHistory} />
        </div>
      )}

      <ConfirmDialog
        open={confirmSubmit}
        onOpenChange={setConfirmSubmit}
        title="Nộp bài?"
        description={`Bạn còn ${unansweredCount(s.questions, s.progress.answers)} câu chưa trả lời. Sau khi nộp bạn không thể sửa bài.`}
        confirmText="Nộp bài"
        isLoading={s.busy}
        onConfirm={async () => {
          await s.submit();
          setConfirmSubmit(false);
        }}
      />
    </div>
  );
}

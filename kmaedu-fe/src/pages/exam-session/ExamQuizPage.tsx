 
import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useLocation, useSearchParams } from "react-router-dom";
import { setRedirectBackTarget } from "@/lib/authRedirect";
import { useAuthStore } from "@/stores/useAuthStore";
import { ConfirmDialog } from "@/components/organisms/ConfirmDialog";
import { toast } from "@/components/antd/toast";
import { useDebounce } from "@/hooks/useDebounce";
import { useCheatingDetection } from "@/hooks/useCheatingDetection";
import { CheatingWarningModal } from "@/components/molecules/CheatingWarningModal";
import { startExamAttemptApi, updateExamAttemptProgressApi, getExamAttemptDetailApi, submitExamAttemptApi, type Question } from "@/apis/examAttemptApi";
import { useLeaveHandIn } from "./use-leave-hand-in";
import { quizKeyAction } from "@/lib/exam-session/quiz-keys";
import { QuizHeader } from "@/components/organisms/quiz/quiz-header";
import { QuizProgressSegments } from "@/components/organisms/quiz/quiz-progress-segments";
import { QuizQuestionCard } from "@/components/organisms/quiz/quiz-question-card";
import { QuizNavigatorCard } from "@/components/organisms/quiz/quiz-navigator-card";
import { QuizFooter } from "@/components/organisms/quiz/quiz-footer";
import { QuizResultCard } from "@/components/organisms/quiz/quiz-result-card";
import { QuizReviewView } from "@/components/organisms/quiz/quiz-review-view";
import { QuizStatusScreen } from "@/components/organisms/quiz/quiz-status-screen";
import { env } from "@/lib/env";
import {
  fetchAndDecryptSecureQuiz,
  submitSecureQuiz,
  type DecryptedQuestion,
  type QuestionTokenMap,
} from "@/lib/secureQuizHelpers";

export default function ExamQuizPage() {
  const { id: examSessionId = "" } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, initializing } = useAuthStore();

  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [isViewOnly, setIsViewOnly] = useState(false);
  const [questions, setQuestions] = useState<DecryptedQuestion[]>([]);
  const [searchParams] = useSearchParams();
  const [tokenMap, setTokenMap] = useState<QuestionTokenMap>(() => new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Set<string>>(() => new Set<string>());
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [showSubmitConfirm, setShowSubmitConfirm] = useState(false);
  const [showDetailedResults, setShowDetailedResults] = useState(false);
  const [reviewQuestionIndex, setReviewQuestionIndex] = useState(0);
  const [resultData, setResultData] = useState<{
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    percentage: number;
    showAnswers: boolean;
    passed: boolean;
    passingScore: number;
    violationCount: number;
    questions?: Question[];
  } | null>(null);
  const [timeSpentSeconds, setTimeSpentSeconds] = useState(() => 0);
  const [timeLimitMinutes, setTimeLimitMinutes] = useState<number | null>(null);
  // When the server stops accepting this attempt (min(start + duration, session end)); null: no limit.
  const [deadline, setDeadline] = useState<string | null>(null);
  /** Seconds until the attempt must be handed in: from the server deadline, else the older minute limit. */
  function secondsLeft(): number | null {
    if (deadline) return Math.floor((Date.parse(deadline) - Date.now()) / 1000);
    return timeLimitMinutes ? timeLimitMinutes * 60 - timeSpentSeconds : null;
  }
  const pastDeadline = () => deadline !== null && Date.now() >= Date.parse(deadline);
  // Session rules for this attempt (older servers send neither: anti-cheat on, leaving allowed).
  const [antiCheatEnabled, setAntiCheatEnabled] = useState(true);
  const [allowLeaveMidway, setAllowLeaveMidway] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [hasWarned30s, setHasWarned30s] = useState(false);

  const returnTo = `${location.pathname}${location.search}${location.hash}`;

  const debouncedAnswers = useDebounce(answers, 1000);
  const debouncedCurrentIndex = useDebounce(currentQuestionIndex, 1000);

  const cheatingDetection = useCheatingDetection({
    examAttemptId: attemptId || "",
    enabled: !!attemptId && !isSubmitted && !loading && antiCheatEnabled,
  });

  const leave = useLeaveHandIn({
    attemptId,
    active: !!attemptId && !isSubmitted && !loading && !allowLeaveMidway,
    progress: () => ({ answers, currentIndex: currentQuestionIndex, markedQuestions: Array.from(markedForReview) }),
  });

  useEffect(() => {
    if (initializing || isAuthenticated) {
      return;
    }

    setRedirectBackTarget(returnTo);
    navigate(`/login?from=${encodeURIComponent(returnTo)}`, { replace: true });
  }, [initializing, isAuthenticated, returnTo, navigate]);

  const saveProgress = useCallback(
    async (overrideAnswers?: Record<string, string>) => {
      if (!attemptId || isSubmitted) return;

      const answersToSave = overrideAnswers ?? answers;

      try {
        await updateExamAttemptProgressApi(attemptId, {
          answers: answersToSave,
          currentIndex: currentQuestionIndex,
          markedQuestions: Array.from(markedForReview),
        });
      } catch (err) {
        console.error("Failed to save progress:", err);
      }
    },
    [attemptId, answers, currentQuestionIndex, markedForReview, isSubmitted],
  );

  const autoSubmittingRef = useRef(false);
  const [autoSubmitFailed, setAutoSubmitFailed] = useState(false);

  const handleAutoSubmit = useCallback(async () => {
    if (!attemptId || tokenMap.size === 0) return;
    // Re-entry guard: the time-up effect re-fires every second; don't stack
    // overlapping auto-submits.
    if (autoSubmittingRef.current) return;
    autoSubmittingRef.current = true;

    try {
      // Past the deadline the server refuses late progress (409): what was saved before still counts.
      // Before it, a failed save stops here and the candidate retries, so no newer answer is lost.
      const late = pastDeadline();
      const saving = updateExamAttemptProgressApi(attemptId, {
        answers,
        currentIndex: currentQuestionIndex,
        markedQuestions: Array.from(markedForReview),
      });
      // 409: the server's clock says the deadline passed (ours may lag): what was saved still counts.
      await saving.catch((err) => {
        if (late || (err?.status ?? err?.response?.status) === 409) return;
        throw err;
      });

      // Question tokens expire at the deadline (+30s); only then (400) hand in the saved answers instead.
      const result = await submitSecureQuiz(attemptId, answers, tokenMap).catch((err) => {
        if (late && (err?.status ?? err?.response?.status) === 400) return submitExamAttemptApi(attemptId);
        throw err;
      });
      setResultData({
        score: result.score,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        percentage: result.percentage,
        showAnswers: result.showAnswers,
        passed: result.passed,
        passingScore: result.passingScore,
        violationCount: cheatingDetection.totalViolations,
        questions: result.questions,
      });
      setIsSubmitted(true);
      toast.info("Đã hết thời gian", {
        description: "Bài thi đã được tự động nộp",
      });
    } catch (err: any) {
      // Stop the per-second retry loop and surface the reason, so the user
      // isn't stuck on the quiz with no feedback (e.g. stale tokens after a
      // secret rotation, or timer drift past JWT expiry). Answers stay saved.
      console.error("Failed to auto-submit:", err);
      setAutoSubmitFailed(true);
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Không thể tự động nộp bài. Vui lòng tải lại trang rồi nộp lại — câu trả lời của bạn vẫn được lưu.";
      toast.error(message);
    } finally {
      autoSubmittingRef.current = false;
    }
  }, [attemptId, answers, currentQuestionIndex, markedForReview, tokenMap, deadline]);

  useEffect(() => {
    if (!examSessionId || initializing || !isAuthenticated) return;
    // Set by the cleanup: this load was replaced (StrictMode remount, new location) and must not
    // touch state or toast once its requests come back.
    let cancelled = false;

    const initExam = async () => {
      // Reset all quiz state before (re-)initializing
      setLoading(true);
      setError(null);
      setIsSubmitted(false);
      setResultData(null);
      setQuestions([]);
      setAnswers({});
      setMarkedForReview(new Set());
      setCurrentQuestionIndex(0);
      setAttemptId(null);
      setIsViewOnly(false);
      setShowDetailedResults(false);
      setTimeSpentSeconds(0);
      setHasWarned30s(false);

      const urlAttemptId = searchParams.get("attemptId");
      const urlViewResult = searchParams.get("view") === "result";

      try {
        // Case 1: view=result — load completed attempt detail
        if (urlViewResult && urlAttemptId) {
          setAttemptId(urlAttemptId);
          setIsViewOnly(true);

          const detail = await getExamAttemptDetailApi(urlAttemptId);
          if (cancelled) return;

          // Backend now returns userAnswer per question directly.
          const resultQuestions: Question[] = (detail.questions || []).map((q) => ({
            id: q.id,
            question: q.question,
            options: q.options,
            answer: q.answer,
            userAnswer: q.userAnswer ?? null,
          }));
          // The server graded the attempt; its key is only sent when the session shows answers after hand-in.
          const score = detail.score ?? detail.examAttempt.score ?? 0;
          const passingScore = detail.passingScore || 0;

          setQuestions([]);
          setAnswers(detail.examAttempt.answers || {});
          setCurrentQuestionIndex(0);

          setResultData({
            score,
            totalQuestions: detail.totalQuestions || resultQuestions.length,
            correctAnswers: detail.correctAnswers ?? 0,
            percentage: Math.round(score * 10) / 10,
            showAnswers: resultQuestions.some((q) => q.answer !== undefined && q.answer !== null),
            passed: score >= passingScore,
            passingScore,
            violationCount: detail.violationCount || 0,
            questions: resultQuestions,
          });
          setIsSubmitted(true);
          setTimeSpentSeconds(detail.examAttempt.timeSpentSeconds || 0);

          toast.success("Đang xem kết quả", {
            description: detail.examRoom?.title ?? "Bài thi đã hoàn thành",
          });

          return;
        }

        // Case 2 & 3: normal flow (new or resume). Forward the verified access
        // code (if any) so the server can enforce access for code-gated
        // sessions when the attempt is created (C3).
        const storedAccessCode =
          sessionStorage.getItem(`kmaedu:exam-code:${examSessionId}`) ?? undefined;
        const startResult = await startExamAttemptApi(
          examSessionId,
          storedAccessCode,
        );
        if (cancelled) return;
        setAttemptId(startResult.examAttempt.id);

        const secureQuizData = await fetchAndDecryptSecureQuiz(startResult.examAttempt.id);
        if (cancelled) return;

        setQuestions(secureQuizData.questions);
        setTokenMap(secureQuizData.tokenMap);

        const savedAnswers = secureQuizData.savedAnswers || {};
        setAnswers(savedAnswers);
        setCurrentQuestionIndex(secureQuizData.currentIndex || 0);
        setMarkedForReview(new Set(secureQuizData.markedQuestions || []));

        if (secureQuizData.startedAt) {
          const startedAtDate = new Date(secureQuizData.startedAt);
          const now = new Date();
          const elapsedSeconds = Math.floor((now.getTime() - startedAtDate.getTime()) / 1000);
          setTimeSpentSeconds(Math.max(0, elapsedSeconds));
        }

        if (startResult.isResume && Object.keys(savedAnswers).length > 0) {
          toast.info("Tiếp tục làm bài", {
            description: "Dữ liệu của bạn đã được khôi phục",
          });
        }

        setTimeLimitMinutes(secureQuizData.timeLimitMinutes);
        setDeadline(secureQuizData.deadline ?? null);
        setAntiCheatEnabled(secureQuizData.antiCheatEnabled ?? true);
        const leaveAllowed = secureQuizData.allowLeaveMidway ?? true;
        setAllowLeaveMidway(leaveAllowed);
        if (!leaveAllowed && secureQuizData.status !== 1) {
          toast.warning("Không được thoát giữa chừng", { description: "Rời trang làm bài sẽ tự động nộp bài." });
        }

        if (secureQuizData.status === 1) {
          setIsSubmitted(true);
          setResultData({
            score: 0,
            totalQuestions: secureQuizData.totalQuestions,
            correctAnswers: 0,
            percentage: 0,
            showAnswers: false,
            passed: false,
            passingScore: 0,
            violationCount: 0,
            questions: undefined,
          });
        }
      } catch (err: any) {
        if (cancelled) return;
        const message = err?.response?.data?.message || err?.message || "Không thể bắt đầu bài thi";
        // Access denied (e.g. code-gated session opened without a verified
        // code) — send the user to the session page to enter the access code
        // instead of dead-ending here.
        if ((err?.status ?? err?.response?.status) === 403) {
          toast.error(message);
          navigate(`/exam-session/${examSessionId}`, { replace: true });
          return;
        }
        setError(message);
        toast.error(message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initExam();
    return () => {
      cancelled = true;
    };
  }, [examSessionId, initializing, isAuthenticated, location.key]);

  useEffect(() => {
    if (!loading && !isSubmitted && questions.length > 0) {
      timerRef.current = setInterval(() => {
        setTimeSpentSeconds((prev) => prev + 1);
      }, 1000);

      return () => {
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
      };
    }
  }, [loading, isSubmitted, questions.length]);

  useEffect(() => {
    const remainingSeconds = secondsLeft();
    if (remainingSeconds !== null && !loading && !isSubmitted) {

      if (remainingSeconds <= 30 && remainingSeconds > 0 && !hasWarned30s) {
        setHasWarned30s(true);
        toast.warning("Sắp hết thời gian!", {
          description: "Còn 30 giây nữa sẽ tự động nộp bài",
        });
      }

      // Stop retrying once an auto-submit has failed — otherwise this effect
      // re-fires every second and loops the same error forever.
      if (remainingSeconds <= 0 && !autoSubmitFailed) {
        handleAutoSubmit();
      }
    }
  }, [timeSpentSeconds, timeLimitMinutes, deadline, loading, isSubmitted, hasWarned30s, handleAutoSubmit, autoSubmitFailed]);

  useEffect(() => {
    if (attemptId && !loading && !isSubmitted) {
      saveProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedAnswers, debouncedCurrentIndex]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (attemptId && !isSubmitted && env.apiUrl) {
        navigator.sendBeacon(
          `${env.apiUrl}/examattempts/${attemptId}/progress`,
          JSON.stringify({
            answers,
            currentIndex: currentQuestionIndex,
            markedQuestions: Array.from(markedForReview),
          }),
        );
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [attemptId, isSubmitted, answers, currentQuestionIndex, markedForReview]);

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = isViewOnly
    ? (resultData?.questions?.length ?? 0)
    : questions.length;
  // A taken-back answer stays in the map as "": count only real picks.
  const answeredCount = Object.values(answers).filter(Boolean).length;

  const formatTimeLabel = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const getRemainingTime = () => {
    const remaining = secondsLeft();
    return remaining === null ? null : Math.max(0, remaining);
  };

  const handleAnswerSelect = (answer: string) => {
    if (!currentQuestion) return;
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answer,
    }));
  };

  const handleMarkForReview = () => {
    if (!currentQuestion) return;
    setMarkedForReview((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(currentQuestion.id)) {
        newSet.delete(currentQuestion.id);
      } else {
        newSet.add(currentQuestion.id);
      }
      return newSet;
    });
  };

  // One hand-in at a time: a double click or a key press while it is sent must not send it again.
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const doSubmit = async () => {
    if (!attemptId || tokenMap.size === 0 || submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);

    try {
      await saveProgress(answers);
      const result = await submitSecureQuiz(attemptId, answers, tokenMap);
      setResultData({
        score: result.score,
        totalQuestions: result.totalQuestions,
        correctAnswers: result.correctAnswers,
        percentage: result.percentage,
        showAnswers: result.showAnswers,
        passed: result.passed,
        passingScore: result.passingScore,
        violationCount: cheatingDetection.totalViolations,
        questions: result.questions,
      });
      setIsSubmitted(true);
      setShowSubmitConfirm(false);
      toast.success("Nộp bài thành công!");
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Nộp bài thất bại";
      toast.error(message);
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  const handleExit = () => {
    navigate(`/exam-session/${examSessionId}`);
  };

  const goPrev = () => setCurrentQuestionIndex((i) => Math.max(0, i - 1));
  const goNext = () => setCurrentQuestionIndex((i) => Math.min(questions.length - 1, i + 1));

  // A, B, C… pick an option, ← / → move between questions; off while a dialog is open.
  const keysActive = !loading && !isSubmitted && !submitting && questions.length > 0 && !showSubmitConfirm && !leave.blocked && !cheatingDetection.isWarningVisible;
  const keyHandlerRef = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandlerRef.current = (e) => {
    const action = quizKeyAction(e, currentQuestion?.options.length ?? 0);
    if (!action) return;
    e.preventDefault();
    if (action.type === "prev") goPrev();
    else if (action.type === "next") goNext();
    // The same letter again takes the answer back, as a second click on the option does.
    else handleAnswerSelect(currentQuestion && answers[currentQuestion.id] === action.letter ? "" : action.letter);
  };
  useEffect(() => {
    if (!keysActive) return;
    const onKey = (e: KeyboardEvent) => keyHandlerRef.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysActive]);

  const backToRoom = { label: "Về phòng thi", onClick: handleExit };
  const toMyExams = { label: "Bài thi của tôi", onClick: () => navigate("/k/my-exams") };

  if (initializing || !isAuthenticated) {
    return <QuizStatusScreen tone="loading" title="Đang kiểm tra đăng nhập" message="Chờ một chút, chúng tôi đang xác nhận tài khoản của bạn." />;
  }

  if (loading) {
    return <QuizStatusScreen tone="loading" title="Đang tải bài thi" message="Đề thi và câu trả lời đã lưu đang được tải về." />;
  }

  if (error) {
    return <QuizStatusScreen tone="error" title="Không thể vào bài thi" message={error} primary={backToRoom} secondary={toMyExams} />;
  }

  if (totalQuestions === 0) {
    return <QuizStatusScreen tone="empty" title="Không có câu hỏi" message="Bài thi này chưa có câu hỏi nào. Hãy liên hệ người tạo phòng thi." primary={backToRoom} secondary={toMyExams} />;
  }

  if (isSubmitted && resultData) {
    const correctAnswersCount = resultData.correctAnswers;
    const percentage = resultData.percentage;
    const passed = resultData.passed;

    if (showDetailedResults && resultData.showAnswers && resultData.questions) {
      return (
        <QuizReviewView
          questions={resultData.questions}
          index={reviewQuestionIndex}
          onIndexChange={setReviewQuestionIndex}
          onOverview={() => { setShowDetailedResults(false); window.scrollTo(0, 0); }}
        />
      );
    }

    return (
      <QuizResultCard
        passed={passed}
        correct={correctAnswersCount}
        total={totalQuestions}
        percentage={percentage}
        timeLabel={formatTimeLabel(timeSpentSeconds)}
        violations={resultData.violationCount ?? 0}
        onDetail={resultData.showAnswers && resultData.questions ? () => { setShowDetailedResults(true); setReviewQuestionIndex(0); window.scrollTo(0, 0); } : undefined}
        onRetake={() => navigate(`/exam-session/${examSessionId}/quiz`)}
        onExit={handleExit}
      />
    );
  }

  const remainingTime = getRemainingTime();

  return (
    <>
      <ConfirmDialog
        open={showSubmitConfirm}
        onOpenChange={setShowSubmitConfirm}
        title="Xác nhận nộp bài"
        description={`Bạn mới trả lời ${answeredCount}/${totalQuestions} câu hỏi. Bạn có chắc muốn nộp bài?`}
        confirmText="Nộp bài"
        cancelText="Tiếp tục làm"
        onConfirm={doSubmit}
      />

      <ConfirmDialog
        open={leave.blocked}
        onOpenChange={(open) => !open && !leave.leaving && leave.stayHere()}
        title="Rời phòng thi?"
        description="Phiên thi này không cho phép thoát giữa chừng. Rời trang sẽ nộp bài ngay với các câu đã trả lời."
        confirmText="Nộp bài và rời đi"
        cancelText="Ở lại làm tiếp"
        variant="destructive"
        isLoading={leave.leaving}
        onConfirm={() => void leave.confirmLeave()}
        onCancel={leave.stayHere}
      />

      <CheatingWarningModal
        open={cheatingDetection.isWarningVisible}
        onClose={cheatingDetection.dismissWarning}
        violationType={cheatingDetection.lastViolationType}
        totalViolations={cheatingDetection.totalViolations}
      />

      <div className="flex min-h-[100dvh] flex-col bg-page bg-[radial-gradient(60rem_40rem_at_-10%_10%,color-mix(in_oklab,var(--brand-soft)_70%,transparent),transparent_60%)]">
        <QuizHeader
          title="Bài thi"
          current={currentQuestionIndex + 1}
          total={totalQuestions}
          answered={answeredCount}
          remaining={remainingTime}
          elapsed={timeSpentSeconds}
          onExit={handleExit}
        />

        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 xl:px-6">
          <QuizProgressSegments answered={questions.map((q) => !!answers[q.id])} current={currentQuestionIndex} onJump={setCurrentQuestionIndex} />

          <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
            {currentQuestion && (
              <QuizQuestionCard
                index={currentQuestionIndex}
                total={totalQuestions}
                question={currentQuestion.question}
                options={currentQuestion.options}
                selected={answers[currentQuestion.id]}
                marked={markedForReview.has(currentQuestion.id)}
                onSelect={handleAnswerSelect}
                onToggleMark={handleMarkForReview}
              />
            )}
            <div>
              <QuizNavigatorCard
                ids={questions.map((q) => q.id)}
                answered={new Set(Object.keys(answers).filter((qid) => answers[qid]))}
                marked={markedForReview}
                current={currentQuestionIndex}
                onJump={setCurrentQuestionIndex}
                onSubmit={() => setShowSubmitConfirm(true)}
                warning={remainingTime !== null && remainingTime <= 300 && remainingTime > 0 ? `Còn ${Math.ceil(remainingTime / 60)} phút, bài sẽ tự nộp khi hết giờ` : null}
              />
            </div>
          </div>
        </main>

        <QuizFooter
          current={currentQuestionIndex}
          total={totalQuestions}
          onPrev={goPrev}
          onNext={goNext}
          last={{ label: "Nộp bài", onClick: () => (answeredCount < totalQuestions ? setShowSubmitConfirm(true) : doSubmit()) }}
        />
      </div>
    </>
  );
}

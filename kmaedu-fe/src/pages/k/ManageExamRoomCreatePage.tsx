import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeftIcon, ArrowRightIcon, CircleNotchIcon, MonitorIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import type { CreateRoomDraft } from "@/lib/exam-room/create-room-draft";
import { BasicInfoSection } from "./components/exam-room-create/basic-info-section";
import { CreateRoomStepper } from "./components/exam-room-create/create-room-stepper";
import { ExamConfigSection } from "./components/exam-room-create/exam-config-section";
import { ReviewStep } from "./components/exam-room-create/review-step";
import { RulesSection } from "./components/exam-room-create/rules-section";
import { useCreateExamRoom } from "./components/exam-room-create/use-create-exam-room";
import { activeSectionIndex } from "./components/exam-room-create/active-section";

const REVIEW = 3;
/** Fallback reading line (px from the viewport top): app header 76px + stepper. */
const READING_LINE = 140;
/** The form step that owns each field (to bring the first error into view). */
const STEP_OF: Partial<Record<keyof CreateRoomDraft, number>> = {
  title: 0,
  quizSetId: 0,
  description: 0,
  durationMinutes: 1,
  questionCount: 1,
  joinDeadline: 2,
};

/**
 * /k/manage-exam-room/new: the design's create page. Steps 1-3 are the three cards of one form (the stepper
 * follows the card in view); "Tiếp tục" checks the form and opens step 4, the review, which creates the room
 * and opens its first session. ?quizSetId= prefills the quiz set ("Sử dụng đề thi này").
 */
export default function ManageExamRoomCreatePage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const form = useCreateExamRoom(params.get("quizSetId") ?? "");
  const [step, setStep] = useState(0);
  const sections = useRef<(HTMLElement | null)[]>([]);
  const stepperRef = useRef<HTMLDivElement>(null);
  const reviewing = step === REVIEW;

  // While editing, the stepper follows the scroll: the card that has reached the line under the sticky stepper.
  useEffect(() => {
    if (reviewing) return;
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (stepperRef.current?.getBoundingClientRect().bottom ?? READING_LINE) + 24;
      const tops = sections.current.slice(0, 3).map((el) => (el ? el.getBoundingClientRect().top : null));
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      setStep(activeSectionIndex(tops, line, atBottom));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [reviewing]);

  const goToStep = (index: number): void => {
    if (index === REVIEW) {
      next();
      return;
    }
    setStep(index);
    // After leaving the review the cards mount again: scroll once they exist.
    requestAnimationFrame(() => sections.current[index]?.scrollIntoView({ behavior: "smooth", block: "start" }));
  };

  function next(): void {
    const errors = form.check();
    const steps = (Object.keys(errors) as (keyof CreateRoomDraft)[]).map((key) => STEP_OF[key] ?? 0);
    if (steps.length > 0) {
      goToStep(Math.min(...steps));
      return;
    }
    setStep(REVIEW);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  const quizSetTitle = form.quizSets.find((qs) => qs.id === form.draft.quizSetId)?.title;
  const disabled = form.submitting;

  return (
    <div className="mx-auto max-w-[1240px] pb-6">
      <PageHeader icon={<MonitorIcon />} title="Tạo phòng thi" subtitle="Thiết lập thông tin và cấu hình phòng thi của bạn" large />

      {/* Sticky under the app header (76px): the steps stay in view and follow the scroll. */}
      <div
        ref={stepperRef}
        className="sticky top-[76px] z-30 -mx-2 mb-4 rounded-b-xl bg-page/95 px-2 py-2 shadow-[0_8px_16px_-14px_rgba(16,24,40,0.25)] backdrop-blur"
      >
        <CreateRoomStepper active={step} onSelect={goToStep} />
      </div>

      <div className="space-y-4">
        {reviewing ? (
          <ReviewStep draft={form.draft} quizSetTitle={quizSetTitle} questionTotal={form.questionTotal} onEdit={goToStep} />
        ) : (
          <>
            <BasicInfoSection
              ref={(el) => { sections.current[0] = el; }}
              draft={form.draft}
              errors={form.errors}
              quizSets={form.quizSets}
              loadingQuizSets={form.loadingQuizSets}
              disabled={disabled}
              onChange={form.update}
            />
            <ExamConfigSection
              ref={(el) => { sections.current[1] = el; }}
              draft={form.draft}
              errors={form.errors}
              questionTotal={form.questionTotal}
              disabled={disabled}
              onChange={form.update}
            />
            <RulesSection ref={(el) => { sections.current[2] = el; }} draft={form.draft} errors={form.errors} disabled={disabled} onChange={form.update} />
          </>
        )}
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <button
          type="button"
          disabled={disabled}
          onClick={() => (reviewing ? goToStep(0) : navigate("/k/manage-exam-room"))}
          className="inline-flex h-12 min-w-28 items-center justify-center gap-2 rounded-xl border border-hairline-soft bg-canvas px-6 text-sm font-semibold text-ink shadow-[0_1px_2px_rgba(16,24,40,0.05)] hover:border-hairline disabled:opacity-50"
        >
          {reviewing && <ArrowLeftIcon className="size-4" aria-hidden />}
          {reviewing ? "Quay lại" : "Hủy"}
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={reviewing ? () => void form.submit() : next}
          className="inline-flex h-12 min-w-40 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#ff6b4a] to-brand px-7 text-sm font-semibold text-white shadow-[0_8px_20px_rgba(238,47,43,0.25)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] disabled:opacity-60"
        >
          {form.submitting && <CircleNotchIcon className="size-4 animate-spin" aria-hidden />}
          {reviewing ? "Tạo phòng thi" : "Tiếp tục"}
          {!reviewing && <ArrowRightIcon className="size-4" aria-hidden />}
        </button>
      </div>
    </div>
  );
}

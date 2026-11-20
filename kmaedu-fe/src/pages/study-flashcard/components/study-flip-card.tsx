import { ArrowCounterClockwiseIcon, LightbulbIcon, QuestionIcon } from "@phosphor-icons/react";
import { StandardMarkdownRenderer } from "@/components/molecules/StandardMarkdownRenderer";

interface Props {
  question: string;
  answer: string;
  flipped: boolean;
  onFlip: () => void;
}

const face = "absolute inset-0 flex flex-col items-center justify-center overflow-hidden rounded-[28px] px-6 py-10 text-center [backface-visibility:hidden] sm:px-14";

/** The card: red question side, white answer side; a click or Space turns it over. */
export function StudyFlipCard({ question, answer, flipped, onFlip }: Props) {
  return (
    <div className="relative">
      {/* the next cards in the pile, peeking out below */}
      <div aria-hidden className="absolute inset-x-8 -bottom-4 top-8 -rotate-[1.5deg] rounded-[28px] bg-brand-soft shadow-[0_18px_40px_-24px_var(--brand)]" />

      <button
        type="button"
        onClick={onFlip}
        // No aria-label: the name is the visible face (question or answer and its hint); the hidden face is aria-hidden.
        aria-pressed={flipped}
        className="relative block h-[clamp(340px,46dvh,460px)] w-full cursor-pointer select-none rounded-[28px] [perspective:1400px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-brand/30"
      >
        <div
          className="relative size-full transition-transform duration-[600ms] ease-[cubic-bezier(0.2,0.8,0.2,1)] [transform-style:preserve-3d] motion-reduce:transition-none"
          style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
        >
          <div className={`${face} bg-gradient-to-br from-[#e25a5e] via-brand to-brand-strong text-white shadow-[0_30px_60px_-28px_var(--brand)]`} aria-hidden={flipped}>
            <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[340px] rounded-full bg-white/10" />
            <span aria-hidden className="pointer-events-none absolute -bottom-40 -left-24 size-[360px] rounded-full bg-black/10" />
            <span aria-hidden className="pointer-events-none absolute -bottom-10 right-10 select-none text-[260px] font-black leading-none text-white/10">?</span>

            <span className="relative inline-flex items-center gap-2 rounded-full bg-canvas px-5 py-2 text-sm font-extrabold uppercase tracking-[0.12em] text-brand shadow-soft">
              <QuestionIcon weight="bold" className="size-[18px]" aria-hidden />
              Câu hỏi
            </span>
            <StandardMarkdownRenderer
              content={question}
              fontSize={40}
              className="relative mt-6 max-w-3xl font-extrabold leading-tight tracking-tight text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.18)] [&_*]:!text-white [&_*]:font-extrabold [&_*]:!leading-[1.18] [&_p]:!my-0 max-sm:!text-[28px]"
            />
            <span className="absolute bottom-7 flex items-center gap-2 text-sm font-semibold text-white/90">
              <ArrowCounterClockwiseIcon weight="bold" className="size-4" aria-hidden />
              Nhấp hoặc Space để lật
            </span>
          </div>

          <div className={`${face} border border-hairline bg-canvas text-ink shadow-[0_30px_60px_-30px_rgba(15,23,42,0.35)] [transform:rotateY(180deg)]`} aria-hidden={!flipped}>
            <span aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-[340px] rounded-full bg-brand-soft/60" />
            <LightbulbIcon aria-hidden weight="fill" className="pointer-events-none absolute -bottom-6 right-8 size-[220px] text-brand-soft/70" />

            <span className="relative inline-flex items-center gap-2 rounded-full bg-brand-soft px-5 py-2 text-sm font-extrabold uppercase tracking-[0.12em] text-brand">
              <LightbulbIcon weight="bold" className="size-[18px]" aria-hidden />
              Câu trả lời
            </span>
            <StandardMarkdownRenderer content={answer} fontSize={26} className="relative mt-6 max-w-3xl font-semibold text-ink [&_*]:!leading-[1.45] [&_p]:!my-0 max-sm:!text-[20px]" />
            <span className="absolute bottom-7 flex items-center gap-2 text-sm font-semibold text-body">
              <ArrowCounterClockwiseIcon weight="bold" className="size-4" aria-hidden />
              Nhấp hoặc Space để quay lại
            </span>
          </div>
        </div>
      </button>
    </div>
  );
}

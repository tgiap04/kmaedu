import type { ReactNode } from "react";
import { QuestionIcon } from "@phosphor-icons/react";
import { StandardMarkdownRenderer } from "@/components/molecules/StandardMarkdownRenderer";
import { Sparkle } from "@/components/atoms/Sparkle";

interface Props {
  index: number;
  total: number;
  question: string;
  /** Under the number: the chips of the quiz; nothing in review. */
  chips?: ReactNode;
  /** Right side of the header band: mark button or the verdict pill. */
  action: ReactNode;
  /** The options and anything below them. */
  children: ReactNode;
}

/** Card holding one question: the tinted header band, the prompt, then whatever the caller puts below. */
export function QuizQuestionFrame({ index, total, question, chips, action, children }: Props) {
  return (
    <section className="overflow-hidden rounded-3xl border border-hairline bg-canvas shadow-raised">
      <div className="relative flex items-center gap-4 border-b border-hairline-soft bg-gradient-to-r from-brand-soft/70 via-brand-soft/30 to-canvas px-5 py-5 sm:px-7">
        <span className="grid size-14 shrink-0 place-items-center rounded-2xl border border-hairline bg-canvas text-brand shadow-soft">
          <QuestionIcon className="size-7" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold leading-tight text-ink">Câu {index + 1}/{total}</h2>
          {chips && <div className="mt-2 flex flex-wrap gap-2">{chips}</div>}
        </div>
        <Sparkle className="right-52 top-4 hidden size-11 md:block" />
        <Sparkle className="right-[17rem] bottom-3 hidden size-4 md:block" />
        <Sparkle className="right-48 bottom-2 hidden size-6 md:block" />
        <div className="relative ml-auto shrink-0">{action}</div>
      </div>

      <div className="px-5 py-6 sm:px-7 sm:py-7">
        <StandardMarkdownRenderer content={question} fontSize={26} className="font-bold leading-snug text-ink [&_*]:font-bold" />
        {children}
      </div>
    </section>
  );
}

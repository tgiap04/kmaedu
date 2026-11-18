import { FlagIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { QuizOptionRow } from "@/components/molecules/QuizOptionRow";
import { StandardMarkdownRenderer } from "@/components/molecules/StandardMarkdownRenderer";
import type { PracticeQuestion } from "@/apis/quizPracticeApi";

interface QuestionPanelProps {
  question: PracticeQuestion;
  index: number;
  total: number;
  /** Chosen option letter ("A", "B", ...) or "" for none. */
  selected: string;
  marked: boolean;
  onSelect: (letter: string) => void;
  onToggleMark: () => void;
}

export function QuestionPanel({ question, index, total, selected, marked, onSelect, onToggleMark }: QuestionPanelProps) {
  return (
    <div className="rounded-lg border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <div className="p-5 md:p-6">
        <div className="mb-4 flex items-start justify-between">
          <h2 className="text-lg font-bold text-ink">
            Câu {index + 1}/{total}
          </h2>
          <Button variant={marked ? "default" : "outline"} size="sm" onClick={onToggleMark}>
            <FlagIcon className="mr-2 h-4 w-4" />
            {marked ? "Đã đánh dấu" : "Đánh dấu"}
          </Button>
        </div>
        <StandardMarkdownRenderer content={question.question} className="mb-6" fontSize={16} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {question.options.map((option, i) => {
            const letter = String.fromCharCode(65 + i);
            const isSelected = selected === letter;
            return (
              <QuizOptionRow
                key={letter}
                optionLetter={letter}
                state={isSelected ? "selected" : "default"}
                onClick={() => onSelect(isSelected ? "" : letter)}
                content={<StandardMarkdownRenderer content={option} fontSize={13} />}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}

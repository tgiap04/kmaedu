import { toast } from "@/components/antd/toast";
import { copyTitle, groupsFromSet } from "@/lib/manage-exam/quiz-set-detail";
import type { QuizSet, QuizSetLabel, Quizz } from "@/types/quizset";
import { useCreateExamSubmit } from "../create-exam/use-create-exam-submit";

/** "Sao chép": a private copy with the same chapters (colours too), then opens it. */
export function useCopyQuizSet(quizSet: QuizSet | null, questions: Quizz[], labels: QuizSetLabel[]) {
  const copier = useCreateExamSubmit();
  const copy = () => {
    if (!quizSet) return;
    const groups = groupsFromSet(questions, labels);
    const skipped = questions.length - groups.reduce((n, g) => n + g.quizzes.length, 0);
    if (skipped > 0) toast.warning(`Bỏ qua ${skipped} câu thiếu nội dung, đáp án hoặc lựa chọn khi sao chép`);
    void copier.submit(copyTitle(quizSet.title), quizSet.description ?? "", groups, quizSet.tags);
  };
  return { copy, copying: copier.submitting };
}

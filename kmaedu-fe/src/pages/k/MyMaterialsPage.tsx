import { BooksIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import { useCan } from "@/hooks/useCan";
import { MyDocumentsSection } from "./components/my-materials/my-documents-section";
import { MyFlashcardsSection } from "./components/my-materials/my-flashcards-section";
import { SharedQuizSection } from "./components/quiz-practice/SharedQuizSection";

/** /k/my-materials: the learner's documents (when they can use the AI tool), practice quiz sets and flashcards. */
export default function MyMaterialsPage() {
  const canUseAiTool = useCan("ai:generate");
  // The practice list is the learner's: its API needs quiz:practice.
  const canPractice = useCan("quiz:practice");

  return (
    <div className="relative text-foreground">
      <PageHeader icon={<BooksIcon aria-hidden />} title="Tài liệu học tập" subtitle="Khám phá và quản lý các tài liệu, bộ câu hỏi, flashcard của bạn" />

      <div className="space-y-5">
        {canUseAiTool && <MyDocumentsSection />}
        {canPractice && <SharedQuizSection />}
        <MyFlashcardsSection />
      </div>
    </div>
  );
}

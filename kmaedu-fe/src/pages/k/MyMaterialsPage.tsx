import { Copy } from "lucide-react";
import { useCan } from "@/hooks/useCan";
import { MyDocumentsSection } from "./components/my-materials/my-documents-section";
import { MyFlashcardsSection } from "./components/my-materials/my-flashcards-section";
import { SharedQuizSection } from "./components/quiz-practice/SharedQuizSection";

/** /k/my-materials: the learner's documents (when they can use the AI tool), shared quiz sets and flashcards. */
export default function MyMaterialsPage() {
  const canUseAiTool = useCan("ai:generate");

  return (
    <div className="relative text-foreground">
      <header className="mb-6 flex items-center gap-4">
        <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand shadow-[0_8px_20px_rgba(238,47,43,0.12)]">
          <Copy className="size-7 stroke-[1.9]" aria-hidden />
        </span>
        <div className="min-w-0">
          <h1 className="text-3xl font-bold tracking-tight text-ink lg:text-4xl">Tài liệu học tập</h1>
          <p className="mt-1.5 text-base text-body">Khám phá và quản lý các tài liệu, bộ câu hỏi, flashcard của bạn</p>
        </div>
      </header>

      <div className="space-y-5">
        {canUseAiTool && <MyDocumentsSection />}
        <SharedQuizSection />
        <MyFlashcardsSection />
      </div>
    </div>
  );
}

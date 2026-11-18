import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { deleteQuizSetApi } from "@/apis/quizsetApi";
import { toast } from "@/components/antd/toast";
import { Skeleton } from "@/components/antd/skeleton";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { QuizSetModal } from "@/components/organisms/QuizSetModal";
import { ShareQuizSetModal } from "@/components/organisms/ShareQuizSetModal";
import { type LabelFilter, NO_LABEL, filterSetQuestions } from "@/lib/manage-exam/quiz-set-detail";
import { singleFlight } from "@/lib/single-flight";
import { storeCache } from "@/lib/storeCache";
import { useStatsStore } from "@/stores/useStatsStore";
import { QuestionTable } from "./components/quiz-set-detail/question-table";
import { QuizSetDetailHeader } from "./components/quiz-set-detail/quiz-set-detail-header";
import { QuizSetInfoPanel } from "./components/quiz-set-detail/quiz-set-info-panel";
import { type DetailTab, QuizSetTabsBar } from "./components/quiz-set-detail/quiz-set-tabs-bar";
import { QuizSetUsagePanel } from "./components/quiz-set-detail/quiz-set-usage-panel";
import { QuizSetSaveBar } from "./components/quiz-set-detail/quiz-set-save-bar";
import { QuizSetStats } from "./components/quiz-set-detail/quiz-set-stats";
import { useCopyQuizSet } from "./components/quiz-set-detail/use-copy-quiz-set";
import { useQuizSetDetail } from "./components/quiz-set-detail/use-quiz-set-detail";

/** One mount per set: opening another set (e.g. right after "Sao chép") starts from a clean page. */
export default function ManageQuizSetDetailPage() {
  const { id = "" } = useParams();
  return <QuizSetDetail key={id} id={id} />;
}

function QuizSetDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const detail = useQuizSetDetail(id);
  const { quizSet, questions, labels } = detail;
  const invalidateQuizStats = useStatsStore((s) => s.invalidateQuizStats);
  const copier = useCopyQuizSet(quizSet, questions, labels);

  const [tab, setTab] = useState<DetailTab>("questions");
  const [search, setSearch] = useState("");
  const [chosenChapter, setChapter] = useState<LabelFilter>("all");
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<string[] | null>(null);
  const [deleteSetOpen, setDeleteSetOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState(false);
  // Blocks a second click on "Xóa" at once (the guard); `deleting` only drives the spinner.
  const [deleting, setDeleting] = useState(false);
  const [deleteGuard] = useState(singleFlight);

  // A chapter deleted while it is the filter falls back to "all" instead of an empty, unnamed filter.
  const chapter = chosenChapter === "all" || chosenChapter === NO_LABEL || labels.some((l) => l.id === chosenChapter) ? chosenChapter : "all";
  const visible = useMemo(() => filterSetQuestions(questions, chapter, search), [questions, chapter, search]);
  const numbers = useMemo(() => new Map(questions.map((q, i) => [q.id, i + 1])), [questions]);
  // Stable while the set is unchanged, so the edit form does not reset on every render.
  const editInitial = useMemo(
    () => (quizSet ? { title: quizSet.title, description: quizSet.description ?? "", isPublic: quizSet.isPublic, isPinned: quizSet.isPinned, tags: quizSet.tags } : undefined),
    [quizSet],
  );

  if (detail.loading || !quizSet) {
    if (detail.failed) {
      return (
        <div className="py-24 text-center text-body">
          <p>Không tải được đề thi, hoặc đề không còn tồn tại.</p>
          <button type="button" onClick={() => void detail.reload()} className="mt-3 font-semibold text-brand hover:underline">Thử lại</button>
        </div>
      );
    }
    return (
      <div className="space-y-5 pt-2">
        <Skeleton className="h-16 w-full max-w-xl rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  // Every change is saved as it is made; "Lưu đề thi" only closes the page, unless a question is still open.
  const finish = () => {
    if (editingQuestion) {
      toast.warning("Bạn đang sửa một câu hỏi", { description: "Bấm \"Lưu thay đổi\" hoặc \"Hủy\" ở câu đó trước khi lưu đề thi." });
      return;
    }
    toast.success("Đã lưu đề thi");
    navigate("/k/manage-exam");
  };

  const once = (work: () => Promise<void>) => () =>
    deleteGuard(async () => {
      setDeleting(true);
      try {
        await work();
      } finally {
        setDeleting(false);
      }
    });

  const deleteSet = async () => {
    try {
      await deleteQuizSetApi(id);
      storeCache.invalidate("quizsets");
      invalidateQuizStats();
      toast.success("Đã xóa đề thi");
      navigate("/k/manage-exam");
    } catch (error) {
      toast.error("Xóa đề thi thất bại", { description: error instanceof Error ? error.message : undefined });
    }
  };

  return (
    <div className="flex min-w-0 flex-col gap-5 pt-2 pb-6">
      <QuizSetDetailHeader
        quizSet={quizSet}
        copying={copier.copying}
        onEditInfo={() => setEditOpen(true)}
        onShare={() => setShareOpen(true)}
        onCopy={copier.copy}
        onDelete={() => setDeleteSetOpen(true)}
      />

      <QuizSetStats questionCount={questions.length} chapterCount={labels.length} createdAt={quizSet.createdAt} updatedAt={quizSet.updatedAt} />

      <section className="rounded-lg border border-hairline-soft bg-canvas px-4 pt-3 shadow-[0_4px_20px_rgba(15,23,42,0.05)] md:px-5">
        <QuizSetTabsBar
          tab={tab}
          onTabChange={setTab}
          questionCount={questions.length}
          search={search}
          onSearchChange={setSearch}
          labels={labels}
          chapter={chapter}
          onChapterChange={setChapter}
        />
        <div className="pt-4">
          {tab === "questions" && (
            <QuestionTable
              questions={visible}
              numberOf={(qid) => numbers.get(qid) ?? 0}
              labels={labels}
              resetKey={`${chapter}|${search}`}
              emptyText={questions.length === 0 ? "Đề thi chưa có câu hỏi. Bấm \"Thêm câu hỏi\" để bắt đầu." : "Không có câu hỏi nào khớp tìm kiếm hoặc bộ lọc."}
              onAdd={detail.addQuestion}
              onUpdate={detail.updateQuestion}
              onRequestDelete={setPendingDelete}
              onBusyChange={setEditingQuestion}
            />
          )}
          {tab === "info" && (
            <div className="pb-5">
              <QuizSetInfoPanel quizSet={quizSet} questionCount={questions.length} onEditInfo={() => setEditOpen(true)} onShare={() => setShareOpen(true)} onChaptersChange={detail.refresh}
                onOpenChapter={(filter) => {
                  setChapter(filter);
                  setSearch("");
                  setTab("questions");
                }}
              />
            </div>
          )}
          {tab === "usage" && <div className="pb-4"><QuizSetUsagePanel quizSetId={id} /></div>}
        </div>
      </section>

      <QuizSetSaveBar onSave={finish} />

      <QuizSetModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={editInitial}
        isLoading={false}
        onSubmit={async (data) => {
          if (await detail.updateInfo(data)) setEditOpen(false);
        }}
      />
      <ShareQuizSetModal open={shareOpen} onOpenChange={(open) => {
        setShareOpen(open);
        if (!open) void detail.reload();
      }} quizSetId={id} />
      <DeleteConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title={pendingDelete && pendingDelete.length > 1 ? `Xóa ${pendingDelete.length} câu hỏi` : "Xóa câu hỏi"}
        description="Câu hỏi bị xóa sẽ không khôi phục được."
        isLoading={deleting}
        onConfirm={once(async () => {
          // Nothing deleted (e.g. the first request failed): keep the dialog open to retry.
          if (pendingDelete && (await detail.deleteQuestions(pendingDelete)) === 0) return;
          setPendingDelete(null);
        })}
      />
      <DeleteConfirmDialog
        open={deleteSetOpen}
        onOpenChange={setDeleteSetOpen}
        title="Xóa đề thi"
        description={`Xóa "${quizSet.title}" cùng ${questions.length} câu hỏi? Phòng thi đang dùng đề này sẽ không tạo được phiên mới.`}
        isLoading={deleting}
        onConfirm={once(deleteSet)}
      />
    </div>
  );
}

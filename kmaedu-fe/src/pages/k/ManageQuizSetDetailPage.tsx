import { useEffect, useState, useCallback, useRef } from "react";
import { CalendarDays, FileText, Plus, Search, Share2, X } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { useQuizSetStore } from "@/stores/useQuizSetStore";
import { Button } from "@/components/antd/button";
import { PageHeader } from "@/components/k-page/page-header";
import { RowsSkeleton, SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";
import { Badge } from "@/components/antd/badge";
import { Skeleton } from "@/components/antd/skeleton";
import type { Quizz } from "@/types/quizset";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { ShareQuizSetModal } from "@/components/organisms/ShareQuizSetModal";
import { InlineQuestionEditor, type InlineQuestionFormData } from "@/components/organisms/InlineQuestionEditor";
import { LabelManager } from "@/components/organisms/LabelManager";
import { RichTextViewer } from "@/components/molecules/RichTextViewer";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/antd/breadcrumb";
import { getQuizSetQuestionsApi, updateQuestionInQuizSet, type PaginationInfo } from "@/apis/quizsetApi";
import { useDebounce } from "@/hooks/useDebounce";
import { storeCache } from "@/lib/storeCache";
import { Input } from "@/components/antd/input";
import { NumberedPagination } from "./components/numbered-pagination";
import { QuizQuestionRow } from "./components/quiz-question-row";

export default function ManageQuizSetDetailPage() {
  const { id = "" } = useParams();
  const {
    currentQuizSet,
    loading,
    fetchQuizSetById,
    addQuestion,
    updateQuestion,
    deleteQuestion,
  } = useQuizSetStore();

  const [selectedQuestion, setSelectedQuestion] = useState<Quizz | null>(null);
  const [showQuestionForm, setShowQuestionForm] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedQuestions, setPaginatedQuestions] = useState<Quizz[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [questionsLoading, setQuestionsLoading] = useState(false);
  const itemsPerPage = 9;
  const addEditorRef = useRef<HTMLDivElement>(null);
  const editEditorRef = useRef<HTMLDivElement>(null);
  const [questionSearch, setQuestionSearch] = useState("");
  const debouncedSearch = useDebounce(questionSearch, 300);

  // Cache key generator for questions by label
  const getLabelQuestionsCacheKey = (labelId: string) =>
    storeCache.createKey("questions-by-label", { quizSetId: id, labelId });

  // Invalidate label questions cache when question CUD or label CUD
  const invalidateLabelQuestionsCache = (labelId: string) => {
    const cacheKey = getLabelQuestionsCacheKey(labelId);
    storeCache.invalidate(cacheKey);
  };

  // Handle label change from LabelManager
  const handleLabelChange = useCallback(
    (_action: "create" | "update" | "delete", labelId?: string) => {
      if (labelId) {
        invalidateLabelQuestionsCache(labelId);
      }
    },
    [],
  );

  useEffect(() => {
    if (id) {
      fetchQuizSetById(id);
    }
  }, [id, fetchQuizSetById]);

  const fetchQuestions = useCallback(async () => {
    if (!id) return;

    setQuestionsLoading(true);
    try {
      const response = await getQuizSetQuestionsApi(id, currentPage, itemsPerPage);
      setPaginatedQuestions(response.questions);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to fetch questions:", error);
    } finally {
      setQuestionsLoading(false);
    }
  }, [id, currentPage]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleAddQuestion = useCallback(() => {
    setSelectedQuestion(null);
    setShowQuestionForm(true);
  }, []);

  const handleEditQuestion = useCallback((question: Quizz) => {
    setSelectedQuestion(question);
    setShowQuestionForm(true);
  }, []);

  const handleDeleteQuestion = useCallback((questionId: string) => {
    setQuestionToDelete(questionId);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (questionToDelete && id) {
      // Find the question to get its labelId before deletion
      const questionToDeleteObj = paginatedQuestions.find((q) => q.id === questionToDelete);
      const questionLabelId = questionToDeleteObj?.label?.id;

      await deleteQuestion(id, questionToDelete);
      setIsDeleteDialogOpen(false);
      setQuestionToDelete(null);

      // Invalidate label cache if question had label
      if (questionLabelId) {
        invalidateLabelQuestionsCache(questionLabelId);
      }

      if (paginatedQuestions.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
        await fetchQuestions();
      } else {
        await fetchQuestions();
      }
    }
  }, [questionToDelete, id, deleteQuestion, paginatedQuestions, currentPage, fetchQuestions]);

  const handleSaveQuestion = useCallback(
    async (questionData: InlineQuestionFormData) => {
      if (!id) return;

      if (selectedQuestion) {
        // Call API directly and update local state with returned data
        const response = await updateQuestionInQuizSet(id, selectedQuestion.id, questionData);
        setPaginatedQuestions((prev) =>
          prev.map((q) => (q.id === selectedQuestion.id ? response.question : q))
        );
        // Invalidate label cache if question has label
        if (selectedQuestion.label?.id) {
          invalidateLabelQuestionsCache(selectedQuestion.label.id);
        }
      } else {
        await addQuestion(id, questionData);
        await fetchQuestions();
      }

      setShowQuestionForm(false);
      setSelectedQuestion(null);
    },
    [selectedQuestion, id, addQuestion, fetchQuestions],
  );

  const totalQuestions = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;

  if (loading || !currentQuizSet) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72 rounded-2xl" />
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 rounded-[20px]" />
      </div>
    );
  }

  const searchAndAdd = (
    <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
      <div className="relative min-w-0 flex-1 sm:w-64 sm:flex-initial">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Tìm kiếm câu hỏi..."
          value={questionSearch}
          onChange={(e) => {
            setQuestionSearch(e.target.value);
            if (e.target.value) setCurrentPage(1);
          }}
          className="rounded-full pl-9 pr-9"
        />
        {questionSearch && (
          <button
            onClick={() => { setQuestionSearch(""); }}
            aria-label="Xóa tìm kiếm"
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <Button onClick={handleAddQuestion} disabled={showQuestionForm}>
        <Plus className="mr-2 h-4 w-4" />
        Thêm câu hỏi
      </Button>
    </div>
  );

  return (
    <div>
      <div>
        <PageHeader
          icon={<FileText />}
          title={currentQuizSet.title}
          subtitle={
            currentQuizSet.tags && currentQuizSet.tags.length > 0 ? (
              <span className="flex flex-wrap gap-2">
                {currentQuizSet.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </span>
            ) : (
              "Quản lý câu hỏi và nhãn của bộ đề"
            )
          }
          eyebrow={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/k/manage-exam">Quản lý bộ đề</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentQuizSet.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
          actions={
            <Button variant="outline" onClick={() => setIsShareOpen(true)}>
              <Share2 className="mr-2 h-4 w-4" />
              Chia sẻ
            </Button>
          }
        />

        <div className="mb-6 grid gap-4 md:grid-cols-2">
          <HistoryStatCard icon={FileText} title="Tổng số câu hỏi" value={totalQuestions} tone="red" />
          <HistoryStatCard icon={CalendarDays} title="Ngày tạo" value={new Date(currentQuizSet.createdAt).toLocaleDateString("vi-VN")} tone="blue" />
        </div>

        <LabelManager quizSetId={id} onLabelChange={handleLabelChange} />

        <SectionCard
          icon={<FileText />}
          title="Danh sách câu hỏi"
          countLabel={totalQuestions > 0 ? `${totalQuestions} câu` : undefined}
          action={searchAndAdd}
        >
          {showQuestionForm && !selectedQuestion && (
            <div className="p-4 md:p-5">
              <InlineQuestionEditor
                question={null}
                quizSetId={id}
                labels={currentQuizSet.labels}
                onSave={handleSaveQuestion}
                onCancel={() => { setShowQuestionForm(false); setSelectedQuestion(null); }}
                editorRef={addEditorRef}
              />
            </div>
          )}

          {questionsLoading ? (
            <RowsSkeleton rows={4} />
          ) : paginatedQuestions.length > 0 ? (
            <>
              {/* Filter + highlight search matches */}
              {(() => {
                const displayed = debouncedSearch
                  ? paginatedQuestions.filter((q) => {
                    const text = q.question.replace(/<[^>]+>/g, "").toLowerCase();
                    return text.includes(debouncedSearch.toLowerCase());
                  })
                  : paginatedQuestions;

                if (debouncedSearch && displayed.length === 0) {
                  return (
                    <SectionMessage title="Không tìm thấy câu hỏi phù hợp" hint="Thử từ khóa khác hoặc xóa bộ lọc tìm kiếm." />
                  );
                }

                return displayed.map((question, index) => {
                  const actualIndex = (currentPage - 1) * itemsPerPage + index;
                  const isEditing = showQuestionForm && selectedQuestion?.id === question.id;

                  // Highlight search matches in question text
                  const highlightText = (html: string): React.ReactNode => {
                    if (!debouncedSearch) return <RichTextViewer content={html} />;
                    const plainText = html.replace(/<[^>]+>/g, "");
                    const escaped = debouncedSearch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const regex = new RegExp(`(${escaped})`, "gi");
                    const parts = plainText.split(regex);
                    return (
                      <span>
                        {parts.map((part, i) =>
                          regex.test(part) ? (
                            <mark key={i} className="bg-yellow-200">{part}</mark>
                          ) : (
                            <RichTextViewer key={i} content={html} />
                          )
                        )}
                      </span>
                    );
                  };

                  if (isEditing) {
                    return (
                      <div key={question.id} className="p-4 md:p-5">
                        <InlineQuestionEditor
                          question={question}
                          quizSetId={id}
                          labels={currentQuizSet.labels}
                          onSave={handleSaveQuestion}
                          onCancel={() => { setShowQuestionForm(false); setSelectedQuestion(null); }}
                          editorRef={editEditorRef}
                        />
                      </div>
                    );
                  }

                  return (
                    <QuizQuestionRow
                      key={question.id}
                      question={question}
                      number={actualIndex + 1}
                      body={debouncedSearch ? highlightText(question.question) : <RichTextViewer content={question.question} />}
                      disabled={showQuestionForm}
                      onEdit={() => handleEditQuestion(question)}
                      onDelete={() => handleDeleteQuestion(question.id)}
                    />
                  );
                });
              })()}

              {!debouncedSearch && totalPages > 1 && (
                <NumberedPagination
                  page={currentPage}
                  totalPages={totalPages}
                  perPage={itemsPerPage}
                  total={totalQuestions}
                  unit="câu hỏi"
                  onChange={setCurrentPage}
                  onSelect={setCurrentPage}
                />
              )}
            </>
          ) : (
            <SectionMessage title="Chưa có câu hỏi nào" hint={'Nhấn "Thêm câu hỏi" để bắt đầu tạo bộ đề'} />
          )}
        </SectionCard>
      </div>

      <ShareQuizSetModal open={isShareOpen} onOpenChange={setIsShareOpen} quizSetId={id} />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xóa câu hỏi"
        description="Bạn có chắc chắn muốn xóa câu hỏi này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}

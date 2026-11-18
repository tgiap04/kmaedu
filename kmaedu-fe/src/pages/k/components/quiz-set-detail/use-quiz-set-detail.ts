import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  addQuestionToQuizSet,
  deleteQuestionFromQuizSet,
  getQuizSetByIdApi,
  updateQuestionInQuizSet,
  updateQuizSetApi,
} from "@/apis/quizsetApi";
import { toast } from "@/components/antd/toast";
import { invalidateLabelsCache } from "@/components/molecules/LabelSelector";
import type { QuizSetFormData } from "@/components/molecules/QuizSetForm";
import { sortSetQuestions } from "@/lib/manage-exam/quiz-set-detail";
import { storeCache } from "@/lib/storeCache";
import { useStatsStore } from "@/stores/useStatsStore";
import type { QuizSet } from "@/types/quizset";

export interface QuestionInput {
  question: string;
  options: string[];
  answer: string;
  labelId: string | null;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Vui lòng thử lại.");

/**
 * The quiz set with every question (and its chapter) in memory, so search, the chapter filter and
 * paging work across the whole set. Each change saves, then reloads the set once.
 */
export function useQuizSetDetail(id: string) {
  const invalidateQuizStats = useStatsStore((s) => s.invalidateQuizStats);
  const [quizSet, setQuizSet] = useState<QuizSet | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);
  const shown = useRef(false);

  /**
   * Fetches the set; only the newest of overlapping reloads is applied. When the newest one fails
   * while a set is on screen (after a save, the share dialog, "Thử lại"), the user is told the page
   * may be stale; with nothing on screen the page shows its own error.
   */
  const reload = useCallback(async () => {
    const mine = ++latest.current;
    try {
      const data = await getQuizSetByIdApi(id);
      if (mine === latest.current) {
        setQuizSet(data);
        setFailed(false);
        shown.current = true;
      }
    } catch {
      if (mine !== latest.current) return; // a newer reload owns the result
      setFailed(true);
      if (shown.current) toast.error("Chưa tải lại được đề thi", { description: "Dữ liệu trên trang có thể đã cũ, tải lại trang để xem bản mới nhất." });
    } finally {
      if (mine === latest.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void reload();
  }, [reload]);

  const changed = async () => {
    storeCache.invalidate("quizsets");
    invalidateLabelsCache(id);
    invalidateQuizStats();
    await reload();
  };

  /** Runs one change; true when it saved. */
  const run = async (work: () => Promise<unknown>, done: string, fail: string) => {
    try {
      await work();
      toast.success(done);
      await changed();
      return true;
    } catch (error) {
      toast.error(fail, { description: errorText(error) });
      return false;
    }
  };

  const questions = useMemo(() => sortSetQuestions(quizSet?.questions ?? []), [quizSet]);

  return {
    quizSet,
    questions,
    labels: quizSet?.labels ?? [],
    loading,
    failed,
    reload,
    /** Chapters were edited elsewhere on the page (label manager). */
    refresh: changed,
    addQuestion: (data: QuestionInput) => run(() => addQuestionToQuizSet(id, data), "Đã thêm câu hỏi", "Thêm câu hỏi thất bại"),
    updateQuestion: (questionId: string, data: QuestionInput) =>
      run(() => updateQuestionInQuizSet(id, questionId, data), "Đã lưu thay đổi", "Lưu câu hỏi thất bại"),
    /** Deletes one after another so a failure leaves the rest untouched; reports how many went. */
    deleteQuestions: async (ids: string[]) => {
      let deleted = 0;
      try {
        for (const questionId of ids) {
          await deleteQuestionFromQuizSet(id, questionId);
          deleted++;
        }
        toast.success(ids.length > 1 ? `Đã xóa ${deleted} câu hỏi` : "Đã xóa câu hỏi");
      } catch (error) {
        toast.error(`Đã xóa ${deleted}/${ids.length} câu, phần còn lại thất bại`, { description: errorText(error) });
      }
      await changed();
      return deleted;
    },
    updateInfo: (data: QuizSetFormData) =>
      run(
        () => updateQuizSetApi(id, { title: data.title, description: data.description || "", isPublic: data.isPublic, isPinned: data.isPinned, tags: data.tags, questionCount: 0, questions: [] }),
        "Đã cập nhật thông tin đề thi",
        "Cập nhật thông tin thất bại",
      ),
  };
}

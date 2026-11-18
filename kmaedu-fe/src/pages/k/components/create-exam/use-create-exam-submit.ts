import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createQuizSetApi } from "@/apis/quizsetApi";
import { toast } from "@/components/antd/toast";
import { invalidateLabelsCache } from "@/components/molecules/LabelSelector";
import type { ExamChapterGroup } from "@/lib/manage-exam/exam-question-picker";
import { singleFlight } from "@/lib/single-flight";
import { storeCache } from "@/lib/storeCache";
import { useStatsStore } from "@/stores/useStatsStore";
import { saveGroups } from "./save-exam-groups";

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Vui lòng thử lại.");

/**
 * Creates the (private) exam, fills it chapter by chapter, then opens its detail page. Also used to
 * copy a set ("Sao chép"), which passes the source tags.
 * When filling fails the set is kept and opened, so a retry never creates a second copy. A second
 * submit while one runs is ignored, and leaving the page mid-save does not pull the user back.
 */
export function useCreateExamSubmit() {
  const navigate = useNavigate();
  const invalidateQuizStats = useStatsStore((s) => s.invalidateQuizStats);
  const [submitting, setSubmitting] = useState(false);
  const [guard] = useState(singleFlight);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const run = async (title: string, description: string, groups: ExamChapterGroup[], tags: string[]) => {
    const total = groups.reduce((n, g) => n + g.quizzes.length, 0);
    setSubmitting(true);
    try {
      const { quizSet } = await createQuizSetApi({
        title: title.trim(),
        description,
        isPublic: false,
        isPinned: false,
        tags,
        questionCount: 0,
        questions: [],
      });
      storeCache.invalidate("quizsets");
      invalidateQuizStats();

      try {
        await saveGroups(quizSet.id, groups);
        toast.success(`Đã tạo đề thi với ${total} câu hỏi`);
      } catch (error) {
        toast.error("Đã tạo đề thi nhưng chưa thêm đủ câu hỏi", { description: `Mở đề để kiểm tra. ${errorText(error)}` });
      } finally {
        invalidateLabelsCache();
      }
      if (mounted.current) navigate(`/k/manage-quiz-set/${quizSet.id}`);
    } catch (error) {
      toast.error("Tạo đề thi thất bại", { description: errorText(error) });
    } finally {
      setSubmitting(false);
    }
  };

  const submit = (title: string, description: string, groups: ExamChapterGroup[], tags: string[] = []) =>
    guard(() => run(title, description, groups, tags));

  return { submit, submitting };
}

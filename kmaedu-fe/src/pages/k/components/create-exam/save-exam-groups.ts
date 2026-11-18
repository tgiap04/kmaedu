import { assignQuestionsToLabelApi, createLabelApi, setQuizzesToQuizset } from "@/apis/quizsetApi";
import { isChapterColor } from "@/lib/manage-exam/chapter-colors";
import type { ExamChapterGroup } from "@/lib/manage-exam/exam-question-picker";

/** Questions per request: the backend adds them in one transaction (5 s limit), so big chapters go in parts. */
const BATCH = 50;

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

async function saveGroup(quizSetId: string, group: ExamChapterGroup, order: number) {
  let labelId: string | null = null;
  if (group.name) {
    const color = group.color && isChapterColor(group.color) ? group.color : undefined;
    labelId = (await createLabelApi(quizSetId, { name: group.name, order, color })).label.id;
  }
  for (let i = 0; i < group.quizzes.length; i += BATCH) {
    const batch = group.quizzes.slice(i, i + BATCH);
    // The server returns the new ids in the order sent; they are only needed to label the batch.
    const { createdQuestionIds: ids } = await setQuizzesToQuizset({ quizsetIds: [quizSetId], quizzes: batch });
    if (!labelId) continue;
    if (!Array.isArray(ids) || ids.length !== batch.length) {
      throw new Error(`đã thêm ${batch.length} câu nhưng máy chủ không trả về id của chúng, nên chưa gán được vào chương`);
    }
    const { updatedCount } = await assignQuestionsToLabelApi(quizSetId, labelId, ids);
    if (updatedCount !== ids.length) throw new Error(`chỉ gán được ${updatedCount}/${ids.length} câu vào chương`);
  }
}

/**
 * Adds the groups to the new set one chapter at a time: create the label, then add the questions in
 * batches and label exactly the ids each batch created. Unnamed groups stay unlabeled. Stops at the
 * first failure with the chapter's name in the error.
 */
export async function saveGroups(quizSetId: string, groups: ExamChapterGroup[]) {
  let order = 0;
  for (const group of groups) {
    try {
      await saveGroup(quizSetId, group, group.name ? order++ : order);
    } catch (error) {
      // `cause` keeps the original API error (status, code, requestId) for whoever logs it.
      throw new Error(group.name ? `Chương "${group.name}": ${reason(error)}` : reason(error), { cause: error });
    }
  }
}

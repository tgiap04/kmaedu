export const TITLE_MAX = 200;
export const DESCRIPTION_MAX = 1000;

export interface ExamDraftFields {
  title: string;
  description: string;
}

/** Same limits as the old create modal (QuizSetForm). */
export function validateExamDraft(draft: ExamDraftFields): Partial<Record<keyof ExamDraftFields, string>> {
  const errors: Partial<Record<keyof ExamDraftFields, string>> = {};
  if (!draft.title.trim()) errors.title = "Tên đề thi không được để trống";
  else if (draft.title.length > TITLE_MAX) errors.title = `Tên đề thi không được vượt quá ${TITLE_MAX} ký tự`;
  if (draft.description.length > DESCRIPTION_MAX) errors.description = `Mô tả không được vượt quá ${DESCRIPTION_MAX} ký tự`;
  return errors;
}

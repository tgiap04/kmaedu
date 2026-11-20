import { format } from "date-fns";
import type { CredentialsCreateExamSession } from "@/apis/examSessionApi";
import { QUESTION_SELECTION_MODE } from "@/types/examSession";

/** The create-room page: the room itself plus the rules of its first session. */
export interface CreateRoomDraft {
  title: string;
  description: string;
  quizSetId: string;
  durationMinutes: number;
  maxAttempts: number;
  questionMode: "all" | "count";
  questionCount: number | null;
  showAnswersAfterSubmit: boolean;
  /** On: the first session closes at `joinDeadline`; off: it stays open. */
  limitJoinWindow: boolean;
  /** `datetime-local` value (local time). */
  joinDeadline: string;
  antiCheatEnabled: boolean;
  allowLeaveMidway: boolean;
}

export type DraftErrors = Partial<Record<keyof CreateRoomDraft, string>>;

export const TITLE_MAX = 100;
export const DESCRIPTION_MAX = 500;
export const DURATION_MIN = 1;
export const DURATION_MAX = 1440;
export const ATTEMPT_OPTIONS = [1, 2, 3, 5, 10] as const;

const LOCAL_MINUTE = "yyyy-MM-dd'T'HH:mm";

/** The design's defaults; the join window ends at 23:59 of the current day. */
export function defaultDraft(now: Date, quizSetId = ""): CreateRoomDraft {
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59);
  return {
    title: "",
    description: "",
    quizSetId,
    durationMinutes: 30,
    maxAttempts: 1,
    questionMode: "all",
    questionCount: null,
    showAnswersAfterSubmit: true,
    limitJoinWindow: true,
    joinDeadline: format(endOfDay, LOCAL_MINUTE),
    antiCheatEnabled: true,
    allowLeaveMidway: false,
  };
}

/** Field errors of the draft (empty when it can be submitted). `questionTotal` is the chosen set's size, when known. */
export function validateDraft(draft: CreateRoomDraft, now: Date, questionTotal?: number): DraftErrors {
  const errors: DraftErrors = {};
  const title = draft.title.trim();
  if (!title) errors.title = "Vui lòng nhập tên phòng thi";
  else if (title.length > TITLE_MAX) errors.title = `Tên phòng thi tối đa ${TITLE_MAX} ký tự`;
  if (!draft.quizSetId) errors.quizSetId = "Vui lòng chọn bộ đề";
  if (draft.description.trim().length > DESCRIPTION_MAX) errors.description = `Mô tả tối đa ${DESCRIPTION_MAX} ký tự`;

  const { durationMinutes: minutes } = draft;
  if (!Number.isInteger(minutes) || minutes < DURATION_MIN || minutes > DURATION_MAX) {
    errors.durationMinutes = `Thời gian làm bài từ ${DURATION_MIN} đến ${DURATION_MAX} phút`;
  }

  if (draft.questionMode === "count") {
    const count = draft.questionCount;
    if (count === null || !Number.isInteger(count) || count < 1) errors.questionCount = "Nhập số câu cần làm";
    else if (questionTotal !== undefined && count > questionTotal) errors.questionCount = `Bộ đề chỉ có ${questionTotal} câu`;
  }

  if (draft.limitJoinWindow) {
    const deadline = draft.joinDeadline ? new Date(draft.joinDeadline) : null;
    if (!deadline || Number.isNaN(deadline.getTime())) errors.joinDeadline = "Chọn thời hạn tham gia";
    else if (deadline.getTime() <= now.getTime()) errors.joinDeadline = "Thời hạn phải sau thời điểm hiện tại";
  }
  return errors;
}

export function toRoomPayload(draft: CreateRoomDraft) {
  const description = draft.description.trim();
  return { title: draft.title.trim(), description: description || undefined, quizSetId: draft.quizSetId };
}

/** The first session: opens now, closes at the deadline when the join window is limited. */
export function toSessionPayload(draft: CreateRoomDraft, examRoomId: string, now: Date): CredentialsCreateExamSession {
  const byCount = draft.questionMode === "count";
  return {
    examRoomId,
    startTime: now.toISOString(),
    endTime: draft.limitJoinWindow ? new Date(draft.joinDeadline).toISOString() : undefined,
    // maxAttempts is the total number of attempts (the server's limit and every screen agree).
    allowRetake: draft.maxAttempts > 1,
    maxAttempts: draft.maxAttempts,
    showAnswersAfterSubmit: draft.showAnswersAfterSubmit,
    questionSelectionMode: byCount ? QUESTION_SELECTION_MODE.RANDOM_TOTAL : QUESTION_SELECTION_MODE.ALL,
    questionCount: byCount ? draft.questionCount : null,
    durationMinutes: draft.durationMinutes,
    antiCheatEnabled: draft.antiCheatEnabled,
    allowLeaveMidway: draft.allowLeaveMidway,
  };
}

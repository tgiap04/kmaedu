/**
 * Whitelist-based output for what a STUDENT or an anonymous caller sees of an
 * exam session. Fields are picked by name (never `...entity`), so the answer
 * key (`answer` / `isCorrect` at any depth), `accessCode`, `whitelist`, host
 * emails and audit columns can not leak when a column or relation is added.
 */
type Instant = Date | string;

interface UserBrief {
    id: string;
    username: string;
    name: string | null;
}

interface QuizSetBrief {
    id: string;
    title: string;
    description: string | null;
}

interface SessionRow {
    id: string;
    examRoomId: string;
    status: number;
    startTime: Instant;
    endTime: Instant | null;
    timeLimitMinutes: number | null;
    autoJoinByLink: boolean;
    assessType: number;
    allowRetake: boolean;
    maxAttempts: number;
    showAnswersAfterSubmit: boolean;
    passingScore: number;
    questionCount: number | null;
    questionSelectionMode: number;
    labelQuestionConfig: unknown;
    shuffleQuestions: boolean;
    createdAt: Instant;
    updatedAt: Instant;
}

/** A host auth could not resolve (unknown id, auth down) stays `null`. */
const pickUser = (u: UserBrief | null): UserBrief | null =>
    u && {
        id: u.id,
        username: u.username,
        name: u.name,
    };

const pickQuizSet = (q: QuizSetBrief): QuizSetBrief => ({
    id: q.id,
    title: q.title,
    description: q.description,
});

const pickSession = (s: SessionRow) => ({
    id: s.id,
    examRoomId: s.examRoomId,
    status: s.status,
    startTime: s.startTime,
    endTime: s.endTime,
    timeLimitMinutes: s.timeLimitMinutes,
    autoJoinByLink: s.autoJoinByLink,
    assessType: s.assessType,
    allowRetake: s.allowRetake,
    maxAttempts: s.maxAttempts,
    showAnswersAfterSubmit: s.showAnswersAfterSubmit,
    passingScore: s.passingScore,
    questionCount: s.questionCount,
    questionSelectionMode: s.questionSelectionMode,
    labelQuestionConfig: s.labelQuestionConfig,
    shuffleQuestions: s.shuffleQuestions,
    createdAt: s.createdAt,
    updatedAt: s.updatedAt,
});

interface RoomRow {
    id: string;
    title: string;
    description: string | null;
    quizSet: QuizSetBrief;
    host: UserBrief | null;
}

const pickRoom = (r: RoomRow) => ({
    id: r.id,
    title: r.title,
    description: r.description,
    quizSet: pickQuizSet(r.quizSet),
    host: pickUser(r.host),
});

/**
 * `GET study/:id`, `POST study/:id/with-code`: the session and its room, never its questions. Exam content
 * only comes with an attempt (secure-quiz, the attempt's own draw), so a participant cannot read the pool
 * before the start or beyond the questions they will get.
 */
export function toExamSessionStudyView(session: SessionRow & { examRoom: RoomRow }, isOwner: boolean) {
    return {
        ...pickSession(session),
        examRoom: pickRoom(session.examRoom),
        creator: pickUser(session.examRoom.host),
        isOwner,
    };
}

/** `GET get-public/:id` (anonymous, PUBLIC sessions only). */
export function toExamSessionPublicView(
    session: SessionRow & { examRoom: RoomRow }
) {
    return {
        ...pickSession(session),
        examRoom: pickRoom(session.examRoom),
    };
}

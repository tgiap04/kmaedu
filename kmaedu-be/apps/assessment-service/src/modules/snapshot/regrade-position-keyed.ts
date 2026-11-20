import type { QuizSnapshotV1 } from './quiz-snapshot';
import { answersByQuestionId, gradeAnswers, questionsOf } from './snapshot.reader';

const POSITION_KEY = /^q_\d+$/;

export interface PositionKeyedAttempt {
    answers: unknown;
    selectedQuestionIds: readonly string[];
}

export interface Regraded {
    answers: Record<string, string>;
    correctAnswers: number;
    totalQuestions: number;
    score: number;
}

/** True when the saved answers hold at least one `q_<index>` key (the secure quiz page's keys). */
export function hasPositionKeys(answers: unknown): answers is Record<string, string> {
    if (!answers || typeof answers !== 'object' || Array.isArray(answers)) return false;
    return Object.keys(answers).some((key) => POSITION_KEY.test(key));
}

/**
 * The grade an attempt should have had: before the fix, end-room and `/submit` looked answers up
 * by question id only, so answers saved under `q_<index>` counted as wrong. Returns null when the
 * attempt holds no such key — it was graded correctly, and a second run leaves it alone.
 */
export function regradePositionKeyed(snapshot: QuizSnapshotV1, attempt: PositionKeyedAttempt): Regraded | null {
    if (!hasPositionKeys(attempt.answers)) return null;
    const questions = questionsOf(snapshot, attempt.selectedQuestionIds);
    const answers = answersByQuestionId(questions, attempt.answers);
    return { answers, ...gradeAnswers(questions, answers) };
}

import { ASSESS_TYPE, EXAM_ATTEMPT_STATUS } from '../../types';

/** Pure room-roster logic: services query, these functions shape the answer. */

export const ROOM_WINDOWS = {
    '30m': { buckets: 15, bucketMinutes: 2 },
    '1h': { buckets: 12, bucketMinutes: 5 },
    '24h': { buckets: 24, bucketMinutes: 60 },
    '7d': { buckets: 14, bucketMinutes: 720 },
} as const;
export type RoomWindow = keyof typeof ROOM_WINDOWS;

export type RosterAttempt = {
    id: string;
    examSessionId: string;
    userId: string;
    status: number;
    score: number;
    startedAt: Date;
    finishedAt: Date | null;
};
export type RosterSession = {
    id: string;
    assessType: number;
    whitelist: string[];
    passingScore: number;
};
export type CandidateStatus = 'submitted' | 'in_progress' | 'not_started' | 'cancelled';
export type Candidate = {
    userId: string;
    status: CandidateStatus;
    attemptId: string | null;
    sessionId: string | null;
    startedAt: Date | null;
    finishedAt: Date | null;
    score: number | null;
    passed: boolean | null;
    timeSpentSeconds: number | null;
    attemptCount: number;
};
export type CandidateFilter = {
    status?: 'submitted' | 'in_progress' | 'not_started';
    result?: 'passed' | 'failed';
    search?: string;
};
export type CandidateNames = Map<string, { username: string; name: string | null }>;

/** Lowercase, no diacritics, `đ` as `d`: "Nguyễn Đức" and "nguyen duc" fold to the same text. */
export function foldVietnamese(text: string): string {
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/đ/g, 'd');
}

const byUserId = (a: Candidate, b: Candidate) => (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0);

function isLater(a: RosterAttempt, b: RosterAttempt): boolean {
    const diff = a.startedAt.getTime() - b.startedAt.getTime();
    return diff !== 0 ? diff > 0 : a.id > b.id;
}

function statusOf(attempt: RosterAttempt): CandidateStatus {
    if (attempt.status === EXAM_ATTEMPT_STATUS.COMPLETED) return 'submitted';
    if (attempt.status === EXAM_ATTEMPT_STATUS.CANCELLED) return 'cancelled';
    return 'in_progress';
}

/**
 * One candidate per user: their latest attempt in the room (by `startedAt`), then every user
 * whitelisted on a PRIVATE session of the room who has no attempt in it. Started users come first
 * by `startedAt` ascending, the rest by user id. Score, `passed` and time spent are only set for a
 * submitted attempt; `passed` compares with the passing score of the attempt's own session.
 */
export function buildCandidates(attempts: RosterAttempt[], sessions: RosterSession[]): Candidate[] {
    const passing = new Map(sessions.map((s) => [s.id, s.passingScore]));
    const latest = new Map<string, RosterAttempt>();
    const counts = new Map<string, number>();
    for (const a of attempts) {
        counts.set(a.userId, (counts.get(a.userId) ?? 0) + 1);
        const seen = latest.get(a.userId);
        if (!seen || isLater(a, seen)) latest.set(a.userId, a);
    }

    const started: Candidate[] = [...latest.values()]
        .sort(
            (a, b) =>
                a.startedAt.getTime() - b.startedAt.getTime() || (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0)
        )
        .map((a) => {
            const status = statusOf(a);
            const submitted = status === 'submitted';
            return {
                userId: a.userId,
                status,
                attemptId: a.id,
                sessionId: a.examSessionId,
                startedAt: a.startedAt,
                finishedAt: a.finishedAt,
                score: submitted ? a.score : null,
                passed: submitted ? a.score >= (passing.get(a.examSessionId) ?? 0) : null,
                timeSpentSeconds:
                    submitted && a.finishedAt
                        ? Math.max(0, Math.floor((a.finishedAt.getTime() - a.startedAt.getTime()) / 1000))
                        : null,
                attemptCount: counts.get(a.userId) ?? 0,
            };
        });

    const idle = new Set<string>();
    for (const s of sessions) {
        if (s.assessType !== ASSESS_TYPE.PRIVATE) continue;
        for (const userId of s.whitelist) if (!latest.has(userId)) idle.add(userId);
    }
    const notStarted: Candidate[] = [...idle].map((userId) => ({
        userId,
        status: 'not_started',
        attemptId: null,
        sessionId: null,
        startedAt: null,
        finishedAt: null,
        score: null,
        passed: null,
        timeSpentSeconds: null,
        attemptCount: 0,
    }));
    notStarted.sort(byUserId);

    return [...started, ...notStarted];
}

/**
 * `status` and `result` (submitted candidates only) filter on the candidate itself. `search`
 * needs `names`: it keeps candidates whose name or username contains the folded text, and a
 * candidate without a profile never matches. A blank `search` is ignored.
 */
export function filterCandidates(
    candidates: Candidate[],
    filter: CandidateFilter,
    names?: CandidateNames
): Candidate[] {
    const needle = filter.search ? foldVietnamese(filter.search.trim()) : '';
    return candidates.filter((c) => {
        if (filter.status && c.status !== filter.status) return false;
        if (filter.result) {
            if (c.status !== 'submitted') return false;
            if (c.passed !== (filter.result === 'passed')) return false;
        }
        if (needle) {
            const profile = names?.get(c.userId);
            if (!profile) return false;
            const haystack = foldVietnamese(`${profile.name ?? ''}\n${profile.username}`);
            if (!haystack.includes(needle)) return false;
        }
        return true;
    });
}

const SCORE_BUCKETS = 10;

/** Counts by latest status, plus average / passed / ten 10%-wide score buckets over submitted candidates (100 lands in the last). */
export function summarize(candidates: Candidate[]) {
    const scoreBuckets = new Array<number>(SCORE_BUCKETS).fill(0);
    let completed = 0;
    let inProgress = 0;
    let cancelled = 0;
    let notStarted = 0;
    let passed = 0;
    let scoreSum = 0;
    for (const c of candidates) {
        if (c.status === 'in_progress') inProgress++;
        else if (c.status === 'cancelled') cancelled++;
        else if (c.status === 'not_started') notStarted++;
        else {
            completed++;
            const score = c.score ?? 0;
            scoreSum += score;
            if (c.passed) passed++;
            scoreBuckets[Math.min(SCORE_BUCKETS - 1, Math.max(0, Math.floor(score / 10)))]++;
        }
    }
    return {
        candidates: candidates.length,
        completed,
        inProgress,
        notStarted,
        cancelled,
        averageScore: completed === 0 ? null : Math.round((scoreSum / completed) * 10) / 10,
        passed,
        scoreBuckets,
    };
}

/** Every COMPLETED attempt finished in `[now - window, now)`, counted per bucket (oldest first). */
export function timelineBuckets(attempts: RosterAttempt[], window: RoomWindow, now: Date) {
    const { buckets, bucketMinutes } = ROOM_WINDOWS[window];
    const bucketMs = bucketMinutes * 60_000;
    const from = now.getTime() - buckets * bucketMs;
    const counts = new Array<number>(buckets).fill(0);
    for (const a of attempts) {
        if (a.status !== EXAM_ATTEMPT_STATUS.COMPLETED || !a.finishedAt) continue;
        const t = a.finishedAt.getTime();
        if (t < from || t >= now.getTime()) continue;
        counts[Math.floor((t - from) / bucketMs)]++;
    }
    return { window, from: new Date(from).toISOString(), bucketMinutes, counts };
}

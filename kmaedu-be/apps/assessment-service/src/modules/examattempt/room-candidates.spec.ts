import {
    buildCandidates,
    filterCandidates,
    foldVietnamese,
    summarize,
    timelineBuckets,
    type CandidateNames,
    type RosterAttempt,
    type RosterSession,
} from './room-candidates';

const T0 = new Date('2026-11-19T10:00:00.000Z');
const at = (minutes: number) => new Date(T0.getTime() + minutes * 60_000);

const session = (over: Partial<RosterSession> = {}): RosterSession => ({
    id: 's1',
    assessType: 0,
    whitelist: [],
    passingScore: 50,
    ...over,
});
let seq = 0;
const attempt = (over: Partial<RosterAttempt>): RosterAttempt => ({
    id: `a${++seq}`,
    examSessionId: 's1',
    userId: 'u1',
    status: 1,
    score: 80,
    startedAt: at(0),
    finishedAt: at(20),
    ...over,
});

describe('foldVietnamese', () => {
    it('drops diacritics, maps đ and lowercases', () => {
        expect(foldVietnamese('Nguyễn Văn Đức')).toBe('nguyen van duc');
        expect(foldVietnamese('ĐẶNG Thị Ánh')).toBe('dang thi anh');
    });
});

describe('buildCandidates', () => {
    it('an empty room has no candidates', () => {
        expect(buildCandidates([], [session()])).toEqual([]);
    });

    it('takes the latest attempt per user and counts all of them', () => {
        const [c] = buildCandidates(
            [
                attempt({ id: 'old', startedAt: at(0), finishedAt: at(10), score: 30 }),
                attempt({ id: 'new', startedAt: at(30), finishedAt: at(50), score: 90 }),
            ],
            [session()]
        );
        expect(c).toMatchObject({
            userId: 'u1',
            attemptId: 'new',
            status: 'submitted',
            score: 90,
            passed: true,
            attemptCount: 2,
            timeSpentSeconds: 20 * 60,
        });
    });

    it('an in-progress retake after a completed attempt makes the candidate in_progress with no score', () => {
        const [c] = buildCandidates(
            [
                attempt({ id: 'done', startedAt: at(0), score: 95 }),
                attempt({ id: 'retake', status: 0, startedAt: at(60), finishedAt: null, score: 0 }),
            ],
            [session()]
        );
        expect(c).toMatchObject({
            attemptId: 'retake',
            status: 'in_progress',
            score: null,
            passed: null,
            timeSpentSeconds: null,
            attemptCount: 2,
        });
    });

    it('cancelled attempts are reported as cancelled, not passed or failed', () => {
        const [c] = buildCandidates([attempt({ status: 2, finishedAt: null })], [session()]);
        expect(c).toMatchObject({ status: 'cancelled', passed: null, score: null });
    });

    it('passed uses the passing score of the attempt\'s own session, inclusive', () => {
        const sessions = [session({ id: 's1', passingScore: 50 }), session({ id: 's2', passingScore: 0 })];
        const list = buildCandidates(
            [
                attempt({ userId: 'a', examSessionId: 's1', score: 50 }),
                attempt({ userId: 'b', examSessionId: 's1', score: 49.9 }),
                attempt({ userId: 'c', examSessionId: 's2', score: 0 }),
            ],
            sessions
        );
        expect(list.map((c) => [c.userId, c.passed])).toEqual([
            ['a', true],
            ['b', false],
            ['c', true],
        ]);
    });

    it('adds whitelisted users of PRIVATE sessions who have no attempt, once, after the started ones', () => {
        const list = buildCandidates(
            [attempt({ userId: 'zed' })],
            [
                session({ id: 's1', assessType: 1, whitelist: ['zed', 'bob', 'amy'] }),
                session({ id: 's2', assessType: 1, whitelist: ['bob'] }),
                session({ id: 's3', assessType: 0, whitelist: ['pub'] }),
            ]
        );
        expect(list.map((c) => [c.userId, c.status])).toEqual([
            ['zed', 'submitted'],
            ['amy', 'not_started'],
            ['bob', 'not_started'],
        ]);
        expect(list[1]).toMatchObject({
            attemptId: null,
            sessionId: null,
            startedAt: null,
            finishedAt: null,
            score: null,
            passed: null,
            timeSpentSeconds: null,
            attemptCount: 0,
        });
    });

    it('a whitelisted user with an attempt in another session of the room is not "not started"', () => {
        const list = buildCandidates(
            [attempt({ userId: 'bob', examSessionId: 's2' })],
            [
                session({ id: 's1', assessType: 1, whitelist: ['bob'] }),
                session({ id: 's2', assessType: 0 }),
            ]
        );
        expect(list.map((c) => c.status)).toEqual(['submitted']);
    });

    it('equal startedAt falls back to user id', () => {
        const list = buildCandidates([attempt({ userId: 'b' }), attempt({ userId: 'a' })], [session()]);
        expect(list.map((c) => c.userId)).toEqual(['a', 'b']);
    });

    it('orders started users by startedAt ascending', () => {
        const list = buildCandidates(
            [
                attempt({ userId: 'late', startedAt: at(30) }),
                attempt({ userId: 'early', startedAt: at(5) }),
            ],
            [session()]
        );
        expect(list.map((c) => c.userId)).toEqual(['early', 'late']);
    });
});

describe('filterCandidates', () => {
    const list = buildCandidates(
        [
            attempt({ userId: 'pass', score: 70, startedAt: at(0) }),
            attempt({ userId: 'fail', score: 10, startedAt: at(1) }),
            attempt({ userId: 'busy', status: 0, finishedAt: null, score: 0, startedAt: at(2) }),
        ],
        [session({ assessType: 1, whitelist: ['idle'] })]
    );

    it('no filter keeps everyone', () => {
        expect(filterCandidates(list, {})).toHaveLength(4);
    });

    it('filters by status', () => {
        expect(filterCandidates(list, { status: 'submitted' }).map((c) => c.userId)).toEqual(['pass', 'fail']);
        expect(filterCandidates(list, { status: 'in_progress' }).map((c) => c.userId)).toEqual(['busy']);
        expect(filterCandidates(list, { status: 'not_started' }).map((c) => c.userId)).toEqual(['idle']);
    });

    it('result only matches submitted candidates', () => {
        expect(filterCandidates(list, { result: 'passed' }).map((c) => c.userId)).toEqual(['pass']);
        expect(filterCandidates(list, { result: 'failed' }).map((c) => c.userId)).toEqual(['fail']);
        expect(filterCandidates(list, { result: 'failed', status: 'in_progress' })).toEqual([]);
    });

    describe('search', () => {
        const names: CandidateNames = new Map([
            ['pass', { username: 'duc.nguyen', name: 'Nguyễn Văn Đức' }],
            ['fail', { username: 'lan', name: null }],
            ['busy', { username: 'bao', name: 'Trần Bảo' }],
        ]);

        it('matches the name without caring for case or diacritics', () => {
            expect(filterCandidates(list, { search: 'đức' }, names).map((c) => c.userId)).toEqual(['pass']);
            expect(filterCandidates(list, { search: 'DUC' }, names).map((c) => c.userId)).toEqual(['pass']);
            expect(filterCandidates(list, { search: 'nguyên' }, names).map((c) => c.userId)).toEqual(['pass']);
        });

        it('matches the username too, and a candidate without a name', () => {
            expect(filterCandidates(list, { search: 'LAN' }, names).map((c) => c.userId)).toEqual(['fail']);
        });

        it('a candidate with no profile never matches a search', () => {
            expect(filterCandidates(list, { search: 'idle' }, names)).toEqual([]);
        });

        it('a blank search is no search', () => {
            expect(filterCandidates(list, { search: '   ' }, names)).toHaveLength(4);
        });

        it('combines with the other filters', () => {
            expect(filterCandidates(list, { search: 'a', status: 'in_progress' }, names).map((c) => c.userId)).toEqual([
                'busy',
            ]);
        });
    });
});

describe('summarize', () => {
    it('an empty room: zeros, no average, ten empty buckets', () => {
        expect(summarize([])).toEqual({
            candidates: 0,
            completed: 0,
            inProgress: 0,
            notStarted: 0,
            cancelled: 0,
            averageScore: null,
            passed: 0,
            scoreBuckets: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
        });
    });

    it('counts by latest status, averages submitted scores to one decimal, buckets 100 into the last', () => {
        const list = buildCandidates(
            [
                attempt({ userId: 'a', score: 100 }),
                attempt({ userId: 'b', score: 55.55 }),
                attempt({ userId: 'c', score: 0 }),
                attempt({ userId: 'd', score: 9.99 }),
                attempt({ userId: 'e', score: 10 }),
                attempt({ userId: 'f', status: 0, finishedAt: null, score: 0 }),
                attempt({ userId: 'g', status: 2, finishedAt: null, score: 0 }),
            ],
            [session({ assessType: 1, whitelist: ['h'], passingScore: 50 })]
        );
        const s = summarize(list);
        expect(s).toMatchObject({
            candidates: 8,
            completed: 5,
            inProgress: 1,
            cancelled: 1,
            notStarted: 1,
            passed: 2,
        });
        expect(s.averageScore).toBe(35.1); // (100 + 55.55 + 0 + 9.99 + 10) / 5 = 35.108
        expect(s.scoreBuckets).toEqual([2, 1, 0, 0, 0, 1, 0, 0, 0, 1]);
    });

    it('passingScore 0 passes every submitted candidate', () => {
        const list = buildCandidates([attempt({ score: 0 })], [session({ passingScore: 0 })]);
        expect(summarize(list).passed).toBe(1);
    });
});

describe('timelineBuckets', () => {
    const now = at(120);
    const done = (minutesAgo: number, over: Partial<RosterAttempt> = {}) =>
        attempt({ finishedAt: new Date(now.getTime() - minutesAgo * 60_000), ...over });

    it('30m = 15 buckets of 2 minutes, from = now - window', () => {
        const t = timelineBuckets([], '30m', now);
        expect(t).toMatchObject({ window: '30m', bucketMinutes: 2, from: at(90).toISOString() });
        expect(t.counts).toHaveLength(15);
        expect(timelineBuckets([], '1h', now)).toMatchObject({ bucketMinutes: 5 });
        expect(timelineBuckets([], '1h', now).counts).toHaveLength(12);
        expect(timelineBuckets([], '24h', now).counts).toHaveLength(24);
        expect(timelineBuckets([], '7d', now)).toMatchObject({ bucketMinutes: 720 });
        expect(timelineBuckets([], '7d', now).counts).toHaveLength(14);
    });

    it('counts every completed attempt (not just the latest per user) in its bucket', () => {
        const t = timelineBuckets(
            [done(1), done(1.5, { id: 'again' }), done(29), done(15)],
            '30m',
            now
        );
        expect(t.counts[14]).toBe(2); // 0-2 min ago
        expect(t.counts[7]).toBe(1); // 14-16 min ago
        expect(t.counts[0]).toBe(1); // 28-30 min ago
        expect(t.counts.reduce((a, b) => a + b, 0)).toBe(4);
    });

    it('edges: from is included, now and later are not; before from is not', () => {
        const t = timelineBuckets(
            [done(30), done(0), done(-1), done(30.01)],
            '30m',
            now
        );
        expect(t.counts[0]).toBe(1);
        expect(t.counts.reduce((a, b) => a + b, 0)).toBe(1);
    });

    it('ignores in-progress, cancelled and attempts without finishedAt', () => {
        const t = timelineBuckets(
            [done(5, { status: 0 }), done(5, { status: 2 }), attempt({ finishedAt: null })],
            '30m',
            now
        );
        expect(t.counts.reduce((a, b) => a + b, 0)).toBe(0);
    });
});

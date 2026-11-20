/**
 * One-off repair: re-grades handed-in exam attempts whose saved answers still use the quiz page's
 * `q_<index>` keys. Before the fix, end-room and `POST /examattempts/:id/submit` graded those answers
 * as wrong (score 0). secure-submit was never affected (it stores answers by question id).
 *
 * Dry run by default (prints counts only); `--apply` writes the new answers and grade.
 * Idempotent: a re-graded attempt holds question-id keys only and is skipped next time.
 * Attempt caches expire on their own (5 minutes).
 *
 *   ASSESSMENT_DATABASE_URL=postgresql://assessment_svc:***@127.0.0.1:5432/kmaedu?schema=assessment \
 *     yarn regrade:exam-attempts [--apply]
 */
import { createPrismaAdapter } from '../src/prisma/create-prisma-adapter';
import { PrismaClient } from '../src/generated/prisma/client';
import { quizSnapshotSchema, type QuizSnapshotV1 } from '../src/modules/snapshot/quiz-snapshot';
import { hasPositionKeys, regradePositionKeyed } from '../src/modules/snapshot/regrade-position-keyed';
import { EXAM_ATTEMPT_STATUS } from '../src/types';

const PAGE_SIZE = 200;

interface Report {
    scanned: number;
    positionKeyed: number;
    regraded: number;
    scoreChanged: number;
    skippedNoSnapshot: number;
}

async function snapshotLoader(prisma: PrismaClient) {
    const cache = new Map<string, QuizSnapshotV1 | null>();
    return async (sessionId: string): Promise<QuizSnapshotV1 | null> => {
        if (!cache.has(sessionId)) {
            const row = await prisma.examSession.findUnique({ where: { id: sessionId }, select: { quizSnapshot: true } });
            const parsed = quizSnapshotSchema.safeParse(row?.quizSnapshot);
            cache.set(sessionId, parsed.success ? parsed.data : null);
        }
        return cache.get(sessionId) ?? null;
    };
}

export async function regradeAttempts(prisma: PrismaClient, apply: boolean): Promise<Report> {
    const report: Report = { scanned: 0, positionKeyed: 0, regraded: 0, scoreChanged: 0, skippedNoSnapshot: 0 };
    let cursor: string | undefined;
    for (;;) {
        const page = await prisma.examAttempt.findMany({
            where: { status: EXAM_ATTEMPT_STATUS.COMPLETED },
            select: { id: true, examSessionId: true, answers: true, selectedQuestionIds: true, score: true },
            orderBy: { id: 'asc' },
            take: PAGE_SIZE,
            ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
        });
        if (page.length === 0) break;
        cursor = page[page.length - 1].id;
        report.scanned += page.length;
        // One snapshot cache per page: snapshots reach 1 MB each, so memory stays bounded.
        const snapshotOf = await snapshotLoader(prisma);

        for (const attempt of page) {
            if (!hasPositionKeys(attempt.answers)) continue;
            report.positionKeyed++;
            const snapshot = await snapshotOf(attempt.examSessionId);
            if (!snapshot) {
                report.skippedNoSnapshot++;
                continue;
            }
            const regraded = regradePositionKeyed(snapshot, attempt);
            if (!regraded) continue;
            if (regraded.score !== attempt.score) report.scoreChanged++;
            if (apply) {
                await prisma.examAttempt.updateMany({
                    where: { id: attempt.id, status: EXAM_ATTEMPT_STATUS.COMPLETED },
                    data: regraded,
                });
            }
            report.regraded++;
        }
    }
    return report;
}

async function main(): Promise<void> {
    const apply = process.argv.includes('--apply');
    const url = process.env.ASSESSMENT_DATABASE_URL ?? process.env.DATABASE_URL;
    const prisma = new PrismaClient({ adapter: createPrismaAdapter(url) });
    try {
        const report = await regradeAttempts(prisma, apply);
        // In a dry run `regraded` counts the attempts --apply would rewrite.
        console.log(`${apply ? 'applied' : 'dry run (pass --apply to write)'}:`, JSON.stringify(report));
    } finally {
        await prisma.$disconnect();
    }
}

if (require.main === module) {
    main().catch((err) => {
        console.error('regrade failed:', err instanceof Error ? err.message : err);
        process.exit(1);
    });
}

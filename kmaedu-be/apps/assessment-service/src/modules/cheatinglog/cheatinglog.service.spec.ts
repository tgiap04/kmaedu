import { ForbiddenException } from '@nestjs/common';
import { CheatingLogService } from './cheatinglog.service';
import { CHEATING_TYPE } from './dto/create-cheatinglog.dto';

const OWNER = 'u1';
const dto = { examAttemptId: 'att-1', type: CHEATING_TYPE.TAB_SWITCH };

function build(antiCheatEnabled: boolean, over: Record<string, unknown> = {}) {
    const attempt = { id: 'att-1', userId: OWNER, status: 0, examSession: { antiCheatEnabled }, ...over };
    const prisma = {
        examAttempt: {
            findUnique: jest.fn(async () => attempt),
            update: jest.fn(async () => attempt),
        },
    };
    const repo = {
        upsertCheatingLog: jest.fn(async () => ({ type: dto.type, count: 1 })),
        getTotalViolationCount: jest.fn(async () => 1),
    };
    return { service: new CheatingLogService(repo as never, prisma as never), prisma, repo };
}

describe('CheatingLogService.logViolation', () => {
    it('records nothing when the session has anti-cheat turned off', async () => {
        const { service, prisma, repo } = build(false);
        await expect(service.logViolation({ id: OWNER } as never, dto)).resolves.toEqual({ logged: false });
        expect(repo.upsertCheatingLog).not.toHaveBeenCalled();
        expect(prisma.examAttempt.update).not.toHaveBeenCalled();
    });

    it('records the violation and the attempt total when anti-cheat is on', async () => {
        const { service, prisma, repo } = build(true);
        await expect(service.logViolation({ id: OWNER } as never, dto)).resolves.toEqual({
            logged: true,
            type: dto.type,
            count: 1,
            totalViolations: 1,
        });
        expect(repo.upsertCheatingLog).toHaveBeenCalledWith('att-1', dto.type);
        expect(prisma.examAttempt.update).toHaveBeenCalledWith({
            where: { id: 'att-1' },
            data: { violationCount: 1 },
        });
    });

    it("still refuses somebody else's attempt, whatever the session setting", async () => {
        const { service, repo } = build(false);
        await expect(service.logViolation({ id: 'intruder' } as never, dto)).rejects.toBeInstanceOf(
            ForbiddenException
        );
        expect(repo.upsertCheatingLog).not.toHaveBeenCalled();
    });
});

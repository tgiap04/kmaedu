import { BadRequestException, NotFoundException } from '@nestjs/common';
import { consumeCodeAttempt, MAX_WRONG_CODE_GUESSES, type CodeStore } from './one-time-code-attempt';

const messages = { invalid: 'invalid', wrong: 'wrong', expired: 'expired' };

type Row = { code: string; expiresAt: Date; attempts: number };

/** One-row store with Postgres semantics; `onClaimed` lets a test interleave a parallel request. */
function memoryStore(initial: Row | null) {
    const state: { row: Row | null; onClaimed?: () => void } = { row: initial };
    const store: CodeStore = {
        find: async () => (state.row ? { ...state.row } : null),
        claimAttempt: async (max: number, now: Date, code?: string) => {
            const row = state.row;
            if (!row || (code !== undefined && row.code !== code)) return 0;
            if (!(row.attempts < max) || !(row.expiresAt > now)) return 0;
            row.attempts += 1;
            state.onClaimed?.();
            return 1;
        },
        deleteIfExhausted: async (max: number, code?: string) => {
            const row = state.row;
            if (!row || (code !== undefined && row.code !== code) || row.attempts < max) return;
            state.row = null;
        },
    };
    return { state, store };
}

const inAnHour = () => new Date(Date.now() + 3_600_000);

describe('consumeCodeAttempt', () => {
    it('resolves on the right code and spends one attempt', async () => {
        const { state, store } = memoryStore({ code: '123456', expiresAt: inAnHour(), attempts: 0 });

        await expect(consumeCodeAttempt(store, '123456', messages)).resolves.toBeUndefined();
        expect(state.row?.attempts).toBe(1);
    });

    it('404 when there is no code at all', async () => {
        const { store } = memoryStore(null);
        await expect(consumeCodeAttempt(store, '123456', messages)).rejects.toBeInstanceOf(NotFoundException);
    });

    it('the right 5th guess succeeds even when a parallel guess removed the row after the claim', async () => {
        const { state, store } = memoryStore({ code: '123456', expiresAt: inAnHour(), attempts: MAX_WRONG_CODE_GUESSES - 1 });
        state.onClaimed = () => {
            state.row = null;
        };

        await expect(consumeCodeAttempt(store, '123456', messages)).resolves.toBeUndefined();
    });

    it('never deletes a NEWER code that replaced the one this guess was made against', async () => {
        const { state, store } = memoryStore({ code: '111111', expiresAt: inAnHour(), attempts: MAX_WRONG_CODE_GUESSES - 1 });
        // The owner asks for a new code while this wrong guess is in flight; the new row already looks used up.
        state.onClaimed = () => {
            state.row = { code: '222222', expiresAt: inAnHour(), attempts: MAX_WRONG_CODE_GUESSES };
        };

        const error = await consumeCodeAttempt(store, '000000', messages).catch((e) => e);

        expect(error).toBeInstanceOf(BadRequestException);
        expect(state.row?.code).toBe('222222');
    });

    it('does not claim an attempt on a newer code either', async () => {
        const { state, store } = memoryStore({ code: '111111', expiresAt: inAnHour(), attempts: 0 });
        const find = store.find;
        let calls = 0;
        // The first read sees the old code, then the owner gets a new one before the claim runs.
        store.find = async () => {
            const seen = await find();
            if (calls++ === 0) state.row = { code: '222222', expiresAt: inAnHour(), attempts: 0 };
            return seen;
        };

        await consumeCodeAttempt(store, '000000', messages).catch(() => undefined);

        expect(state.row).toMatchObject({ code: '222222', attempts: 0 });
    });

    it('deletes the code when the 5th wrong guess uses it up', async () => {
        const { state, store } = memoryStore({ code: '123456', expiresAt: inAnHour(), attempts: MAX_WRONG_CODE_GUESSES - 1 });

        const error = await consumeCodeAttempt(store, '000000', messages).catch((e) => e);

        expect(error.message).toContain('yêu cầu mã mới');
        expect(state.row).toBeNull();
    });
});

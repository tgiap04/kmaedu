import { generateCode } from '@kmaedu/common';
import { isUniqueViolationOn } from './prisma-unique-violation';

/** Draws of a 6-digit code before giving up (5 straight collisions at 1k live codes: ~1e-15). */
export const MAX_CODE_ATTEMPTS = 5;

/**
 * `VerifyAccountCode.code` and `ResetPasswordCode.code` are unique across the
 * whole table, so two users can draw the same 6-digit code and the second
 * write fails with P2002 on `code`. Redraw and rewrite until one sticks
 * (bounded); any other error, including a unique violation on another
 * column, is rethrown untouched. Returns the code that was stored.
 */
export async function writeWithFreshCode(
    write: (code: string) => Promise<unknown>,
    draw: () => string = () => generateCode(6)
): Promise<string> {
    for (let attempt = 1; ; attempt++) {
        const code = draw();
        try {
            await write(code);
            return code;
        } catch (error) {
            if (attempt >= MAX_CODE_ATTEMPTS || !isUniqueViolationOn(error, 'code')) {
                throw error;
            }
        }
    }
}

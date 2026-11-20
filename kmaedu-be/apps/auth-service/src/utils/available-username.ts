import { generateCode } from '@kmaedu/common';

const SUFFIXED_ATTEMPTS = 5;

/**
 * Username for an account created by Google sign-in. The base (Google display
 * name or e-mail local part) is used as is when free; otherwise a random
 * 4-digit suffix is tried a few times, then an 8-digit one is used unchecked
 * (the unique index stays the final guard). `isTaken` decides "free", so it
 * must be the case-insensitive check the signup form uses.
 */
export async function availableUsername(
    base: string,
    isTaken: (username: string) => Promise<boolean>
): Promise<string> {
    const root = base.trim() || 'user';
    if (!(await isTaken(root))) return root;
    for (let i = 0; i < SUFFIXED_ATTEMPTS; i++) {
        const candidate = `${root}${generateCode(4)}`;
        if (!(await isTaken(candidate))) return candidate;
    }
    return `${root}${generateCode(8)}`;
}

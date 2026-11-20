import { NotFoundException } from '@nestjs/common';
import { FlashcardsetService } from './flashcardset.service';

/**
 * `GET /flashcardsets/study/:id/info` is public at the gateway, so it must not
 * describe a set the caller cannot see. A set that is neither visible nor
 * code-protected answers 404, like a missing one; a code set only shows what
 * the code prompt needs (title, creator, requiresCode).
 */
const baseRow = {
    id: 's1',
    title: 'Private set',
    description: 'secret description',
    viewCount: 7,
    isPublic: false,
    accessCode: null as string | null,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    userId: 'owner',
    whitelist: ['friend'],
    codeGrantedIds: ['unlocked'],
    _count: { detailsFlashCard: 3 },
};

function setup(row: typeof baseRow | null) {
    const findUnique = jest.fn(async () => row);
    const withUser = jest.fn(async (r: object) => ({
        ...r,
        user: { id: 'owner', username: 'o', name: null },
    }));
    const service = new FlashcardsetService(
        { flashCardSet: { findUnique } } as never,
        {} as never,
        {} as never,
        {} as never,
        { withUser } as never
    );
    return { service, findUnique };
}

describe('flashcard set public info', () => {
    it.each([
        ['an anonymous caller', undefined],
        ['a stranger', 'stranger'],
    ])('answers 404 for a private set without a code to %s', async (_label, userId) => {
        const { service } = setup({ ...baseRow });
        await expect(
            service.getFlashcardSetPublicInfo('s1', userId)
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('answers 404 for a missing set', async () => {
        const { service } = setup(null);
        await expect(
            service.getFlashcardSetPublicInfo('nope', 'stranger')
        ).rejects.toBeInstanceOf(NotFoundException);
    });

    it.each([
        ['public set, anonymous', { isPublic: true }, undefined],
        ['owner', {}, 'owner'],
        ['whitelisted user', {}, 'friend'],
        ['user who unlocked the code', { accessCode: 'ABC123' }, 'unlocked'],
    ])('returns the full info for a %s', async (_label, over, userId) => {
        const { service } = setup({ ...baseRow, ...over });
        const info = await service.getFlashcardSetPublicInfo('s1', userId);
        expect(info).toMatchObject({
            id: 's1',
            title: 'Private set',
            description: 'secret description',
            viewCount: 7,
            cardCount: 3,
            creator: { id: 'owner' },
        });
    });

    it('shows only what the code prompt needs for a locked code set', async () => {
        const { service } = setup({ ...baseRow, accessCode: 'ABC123' });
        const info = await service.getFlashcardSetPublicInfo('s1', 'stranger');
        expect(info).toEqual({
            id: 's1',
            title: 'Private set',
            creator: { id: 'owner', username: 'o', name: null },
            isPublic: false,
            requiresCode: true,
        });
    });

    it('reads the sharing fields the access decision needs', async () => {
        const { service, findUnique } = setup({ ...baseRow, isPublic: true });
        await service.getFlashcardSetPublicInfo('s1');
        expect(findUnique).toHaveBeenCalledWith(
            expect.objectContaining({
                select: expect.objectContaining({
                    whitelist: true,
                    codeGrantedIds: true,
                }),
            })
        );
    });
});

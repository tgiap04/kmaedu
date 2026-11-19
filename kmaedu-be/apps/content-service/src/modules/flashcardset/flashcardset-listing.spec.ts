import type { AuthUser } from '@kmaedu/auth-jwt';
import { GetFlashcardsetsSchema } from './dto/get-flashcardset.dto';
import { FlashcardsetService } from './flashcardset.service';

/** The set list is sorted by the server (page by page), so every page follows the chosen order. */
const owner = { id: 'u1' } as AuthUser;

function setup() {
    const paginate = jest.fn(async () => ({ data: [], total: 0, page: 1, size: 10, totalPages: 0 }));
    const service = new FlashcardsetService({} as never, { paginate } as never, {} as never, {} as never, {} as never);
    return { service, paginate };
}

const orderFor = async (sort?: string) => {
    const { service, paginate } = setup();
    await service.getFlashcardSets(owner, GetFlashcardsetsSchema.parse({ sort }));
    return (paginate.mock.calls[0] as unknown as [{ orderBy?: unknown }])[0].orderBy;
};

describe('flashcard set list order', () => {
    it.each([
        ['recent', [{ createdAt: 'desc' }, { id: 'desc' }]],
        ['name', [{ title: 'asc' }, { id: 'asc' }]],
        ['cards', [{ detailsFlashCard: { _count: 'desc' } }, { createdAt: 'desc' }, { id: 'desc' }]],
        ['views', [{ viewCount: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }]],
    ])('sort=%s orders by %j', async (sort, expected) => {
        expect(await orderFor(sort)).toEqual(expected);
    });

    it('is newest first without a sort', async () => {
        expect(await orderFor(undefined)).toEqual([{ createdAt: 'desc' }, { id: 'desc' }]);
    });

    it('refuses an unknown sort', () => {
        expect(GetFlashcardsetsSchema.safeParse({ sort: 'random' }).success).toBe(false);
    });
});

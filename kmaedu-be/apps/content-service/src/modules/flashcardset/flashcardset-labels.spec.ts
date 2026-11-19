import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import type { AuthUser } from '@kmaedu/auth-jwt';
import { AssignFlashcardsToLabelSchema } from './dto/flashcard-label.dto';
import { FlashcardsetService } from './flashcardset.service';

/**
 * Card labels. Every card route (list, update, delete) names a card by its FlashCard id; the label
 * routes must too, and must only ever touch the links of the set in the URL.
 */
type Link = { id: string; flashCardSetId: string; flashCardId: string; labelId: string | null };
type Where = Record<string, unknown>;

const owner = { id: 'u1' } as AuthUser;
const label = (id: string, setId: string) => ({ id, flashCardSetId: setId, name: id, color: '#EF4444', order: 0 });
const labels = [label('labA', 'setA'), label('labA2', 'setA'), label('labB', 'setB')];

const matches = (row: Record<string, unknown>, where: Where) =>
    Object.entries(where).every(([key, value]) =>
        value !== null && typeof value === 'object' && 'in' in value ? (value.in as unknown[]).includes(row[key]) : row[key] === value
    );

function setup(links: Link[]) {
    const prisma = {
        flashCardSetLabel: {
            findFirst: jest.fn(async ({ where }: { where: Where }) => labels.find((l) => matches(l, where)) ?? null),
            // The table's unique (flashCardSetId, name): a second label of that name is refused like Postgres does.
            create: jest.fn(async ({ data }: { data: { flashCardSetId: string; name: string } }) => {
                if (labels.some((l) => l.flashCardSetId === data.flashCardSetId && l.name === data.name)) throw Object.assign(new Error('unique'), { code: 'P2002' });
                return { id: 'new', ...data };
            }),
            update: jest.fn(async ({ where, data }: { where: { id: string }; data: { name?: string } }) => {
                const target = labels.find((l) => l.id === where.id)!;
                if (data.name && labels.some((l) => l.id !== target.id && l.flashCardSetId === target.flashCardSetId && l.name === data.name)) throw Object.assign(new Error('unique'), { code: 'P2002' });
                return { ...target, ...data };
            }),
        },
        detailsFlashCard: {
            findMany: jest.fn(async ({ where, include }: { where: Where; include?: unknown }) =>
                links
                    .filter((l) => matches(l, where))
                    .map((l) =>
                        include
                            ? { ...l, flashCard: { id: l.flashCardId, question: 'Q', answer: 'A' }, label: labels.find((x) => x.id === l.labelId) ?? null }
                            : { ...l }
                    )
            ),
            updateMany: jest.fn(async ({ where, data }: { where: Where; data: { labelId: string | null } }) => {
                const hit = links.filter((l) => matches(l, where));
                hit.forEach((l) => (l.labelId = data.labelId));
                return { count: hit.length };
            }),
            count: jest.fn(async ({ where }: { where: Where }) => links.filter((l) => matches(l, where)).length),
        },
        flashCardViewHistory: { create: jest.fn().mockResolvedValue({}) },
    };
    const repo = {
        findOne: jest.fn(async ({ where }: { where: { id: string; userId: string } }) =>
            ['setA', 'setB'].includes(where.id) && where.userId === owner.id ? { id: where.id } : null
        ),
        invalidateItemCache: jest.fn(),
        invalidateUserListCache: jest.fn(),
    };
    const service = new FlashcardsetService(prisma as never, repo as never, { generateId: () => 'h1' } as never, {} as never, {} as never);
    return { service, links, prisma };
}

const link = (id: string, flashCardSetId: string, flashCardId: string, labelId: string | null = null): Link => ({ id, flashCardSetId, flashCardId, labelId });

describe('flashcard labels', () => {
    it('assign puts the cards named by their FlashCard id in the label', async () => {
        const { service, links } = setup([link('d1', 'setA', 'fc1'), link('d2', 'setA', 'fc2')]);
        await service.assignFlashcardsToLabel('setA', 'labA', owner, ['fc1']);
        expect(links.map((l) => l.labelId)).toEqual(['labA', null]);
    });

    it('assign refuses a card of another set and changes nothing', async () => {
        const { service, links } = setup([link('d1', 'setA', 'fc1'), link('d3', 'setB', 'fc3')]);
        await expect(service.assignFlashcardsToLabel('setA', 'labA', owner, ['fc1', 'fc3'])).rejects.toBeInstanceOf(BadRequestException);
        expect(links.map((l) => l.labelId)).toEqual([null, null]);
    });

    it('assign labels only the link of this set when a card is in two sets', async () => {
        const { service, links } = setup([link('d1', 'setA', 'fc1'), link('d4', 'setB', 'fc1')]);
        await service.assignFlashcardsToLabel('setA', 'labA', owner, ['fc1']);
        expect(links.map((l) => l.labelId)).toEqual(['labA', null]);
    });

    it('assign accepts the same card twice', async () => {
        const { service, links } = setup([link('d1', 'setA', 'fc1')]);
        await service.assignFlashcardsToLabel('setA', 'labA', owner, ['fc1', 'fc1']);
        expect(links[0].labelId).toBe('labA');
    });

    it('remove leaves a card that carries another label of the set', async () => {
        const { service, links } = setup([link('d1', 'setA', 'fc1', 'labA2'), link('d2', 'setA', 'fc2', 'labA')]);
        await service.removeFlashcardsFromLabel('setA', 'labA', owner, ['fc1', 'fc2']);
        expect(links.map((l) => l.labelId)).toEqual(['labA2', null]);
    });

    it('assign answers 404 for a label of another set and changes nothing', async () => {
        const { service, links } = setup([link('d1', 'setA', 'fc1')]);
        await expect(service.assignFlashcardsToLabel('setA', 'labB', owner, ['fc1'])).rejects.toBeInstanceOf(NotFoundException);
        expect(links[0].labelId).toBeNull();
    });

    it('assign and remove answer 404 for a set of another user and write nothing', async () => {
        const { service, prisma } = setup([link('d1', 'setA', 'fc1', 'labA')]);
        const stranger = { id: 'u2' } as AuthUser;
        await expect(service.assignFlashcardsToLabel('setA', 'labA', stranger, ['fc1'])).rejects.toBeInstanceOf(NotFoundException);
        await expect(service.removeFlashcardsFromLabel('setA', 'labA', stranger, ['fc1'])).rejects.toBeInstanceOf(NotFoundException);
        expect(prisma.detailsFlashCard.updateMany).not.toHaveBeenCalled();
    });

    it('the card list breaks ties of creation time by link id, so paged reads neither repeat nor skip a card', async () => {
        const { service, prisma } = setup([link('d1', 'setA', 'fc1')]);
        await service.getFlashcardSetFlashcards('setA', owner, 2, 100);
        expect(prisma.detailsFlashCard.findMany).toHaveBeenCalledWith(
            expect.objectContaining({ orderBy: [{ flashCard: { createdAt: 'asc' } }, { id: 'asc' }], skip: 100, take: 100 })
        );
    });

    it('remove clears the label of the cards of this set only', async () => {
        const { service, links } = setup([link('d1', 'setA', 'fc1', 'labA'), link('d4', 'setB', 'fc1', 'labB')]);
        await service.removeFlashcardsFromLabel('setA', 'labA', owner, ['fc1']);
        expect(links.map((l) => l.labelId)).toEqual([null, 'labB']);
    });

    it('reading the card list (the owner managing the set) records no view', async () => {
        const { service, prisma } = setup([link('d1', 'setA', 'fc1')]);
        await service.getFlashcardSetFlashcards('setA', owner, 1, 100);
        expect(prisma.flashCardViewHistory.create).not.toHaveBeenCalled();
    });

    it('creating a label with a name the set already has answers 409, not 500', async () => {
        const { service } = setup([]);
        await expect(service.createLabel('setA', owner, { name: 'labA' } as never)).rejects.toBeInstanceOf(ConflictException);
        await expect(service.createLabel('setA', owner, { name: 'labB' } as never)).resolves.toBeDefined(); // labB is another set's
    });

    it('renaming a label to a name the set already has answers 409', async () => {
        const { service } = setup([]);
        await expect(service.updateLabel('setA', 'labA', owner, { name: 'labA2' } as never)).rejects.toBeInstanceOf(ConflictException);
    });

    it('takes at most 1000 cards in one request', () => {
        const ids = (n: number) => ({ flashcardIds: Array.from({ length: n }, (_, i) => `fc${i}`) });
        expect(AssignFlashcardsToLabelSchema.safeParse(ids(1000)).success).toBe(true);
        expect(AssignFlashcardsToLabelSchema.safeParse(ids(1001)).success).toBe(false);
    });

    it('the card list carries the label of each card (null without one)', async () => {
        const { service } = setup([link('d1', 'setA', 'fc1', 'labA'), link('d2', 'setA', 'fc2')]);
        const { flashCards } = await service.getFlashcardSetFlashcards('setA', owner, 1, 10);
        expect(flashCards.map((c) => ({ id: c.id, label: (c as { label?: { id: string } | null }).label?.id ?? null }))).toEqual([
            { id: 'fc1', label: 'labA' },
            { id: 'fc2', label: null },
        ]);
    });
});

import { BaseRepository } from './base.repository';

class Repo extends BaseRepository<{ id: string }> {
    protected modelName = 'thing';
    protected cachePrefix = 'quizset';
}
class NamespacedRepo extends Repo {
    protected readonly keyNamespace = 'content:';
}

function setup(Impl: typeof Repo) {
    const store = new Map<string, unknown>();
    const redis = {
        get: jest.fn(async (key: string) => (store.has(key) ? store.get(key) : null)),
        set: jest.fn(async (key: string, value: unknown) => void store.set(key, value)),
        del: jest.fn(async (key: string) => void store.delete(key)),
        delPattern: jest.fn(async (pattern: string) => {
            const re = new RegExp(`^${pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*')}$`);
            for (const key of [...store.keys()]) if (re.test(key)) store.delete(key);
        }),
    };
    const model = {
        findMany: jest.fn(async () => [{ id: 'a' }]),
        count: jest.fn(async () => 1),
    };
    const prisma = { thing: model, $transaction: jest.fn() };
    return { store, repo: new Impl(prisma as never, redis as never), model };
}

describe('BaseRepository key namespace', () => {
    it('adds nothing by default (exam-style keys stay as they were)', async () => {
        const { store, repo } = setup(Repo);
        await repo.paginate({ page: 1, size: 5, cache: true }, 'u1');
        expect([...store.keys()].every((k) => k.startsWith('quizset:user:u1:list:'))).toBe(true);
    });

    it('prefixes every key it writes, and its invalidation reaches exactly those keys', async () => {
        const { store, repo, model } = setup(NamespacedRepo);
        await repo.paginate({ page: 1, size: 5, cache: true }, 'u1');
        await repo.findAll({ cache: true });
        await repo.count({}, true);
        expect(store.size).toBe(3);
        expect([...store.keys()].every((k) => k.startsWith('content:'))).toBe(true);

        // a second read is a cache hit (the key it reads is the key it wrote)
        model.findMany.mockClear();
        await repo.paginate({ page: 1, size: 5, cache: true }, 'u1');
        expect(model.findMany).not.toHaveBeenCalled();

        await repo.invalidateWrite('UPDATE', 'x', 'u1');
        expect([...store.keys()].some((k) => k.includes(':user:u1:list:'))).toBe(false);
    });
});

describe('BaseRepository paginate order', () => {
    it('sorts by params.orderBy (several keys) and never treats it as a filter', async () => {
        const { repo, model } = setup(Repo);
        const orderBy = [{ title: 'asc' }, { id: 'asc' }];
        await repo.paginate({ page: 2, size: 5, orderBy, isPublic: true } as never);
        expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy, where: { isPublic: true }, skip: 5, take: 5 }));
    });

    it('keeps the sortBy / sortType default when no orderBy is given', async () => {
        const { repo, model } = setup(Repo);
        await repo.paginate({ page: 1, size: 5, sortBy: 'title', sortType: 'asc' });
        expect(model.findMany).toHaveBeenCalledWith(expect.objectContaining({ orderBy: { title: 'asc' } }));
    });

    it('caches two orders of the same filter apart (one never answers for the other)', async () => {
        const { repo, model } = setup(Repo);
        await repo.paginate({ page: 1, size: 5, cache: true, orderBy: [{ title: 'asc' }] } as never, 'u1');
        await repo.paginate({ page: 1, size: 5, cache: true, orderBy: [{ viewCount: 'desc' }] } as never, 'u1');
        await repo.paginate({ page: 1, size: 5, cache: true, sortBy: 'title', sortType: 'asc' }, 'u1');
        await repo.paginate({ page: 1, size: 5, cache: true, sortBy: 'title', sortType: 'desc' }, 'u1');
        expect(model.findMany).toHaveBeenCalledTimes(4);
    });
});

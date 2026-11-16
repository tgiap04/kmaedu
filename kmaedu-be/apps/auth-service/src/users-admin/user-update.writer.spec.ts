import { UserUpdateWriter } from './user-update.writer';

function setup(existing: Record<string, unknown> | null) {
    const tx = {
        user: {
            findUnique: jest.fn(async () => existing),
            update: jest.fn(async (args: { data: Record<string, unknown> }) => ({ ...existing, ...args.data })),
        },
    };
    const prisma = { $transaction: jest.fn(async (fn: (t: unknown) => Promise<unknown>) => fn(tx)) };
    const users = { invalidateCaches: jest.fn(async () => undefined) };
    const publisher = { publish: jest.fn(async () => undefined) };
    const writer = new UserUpdateWriter(prisma as never, users as never, publisher as never);
    return { writer, tx, users, publisher };
}

describe('UserUpdateWriter', () => {
    it('writes changed fields, publishes the event and drops caches', async () => {
        const { writer, tx, users, publisher } = setup({ id: 'u1', name: 'Old', bio: null });
        const res = await writer.update('u1', { name: 'New', isVerified: true }, 'admin');
        expect(tx.user.update).toHaveBeenCalledWith({
            where: { id: 'u1' },
            data: { updatedBy: 'admin', name: 'New', isVerified: true },
        });
        expect(res?.changed).toEqual(['name', 'is_verified']);
        expect(publisher.publish).toHaveBeenCalledTimes(1);
        expect(users.invalidateCaches).toHaveBeenCalledTimes(1);
    });

    it('writes and publishes nothing when no field changed', async () => {
        const { writer, tx, publisher, users } = setup({ id: 'u1', name: 'Same', bio: null });
        const res = await writer.update('u1', { name: 'Same' }, 'u1');
        expect(res?.changed).toEqual([]);
        expect(tx.user.update).not.toHaveBeenCalled();
        expect(publisher.publish).not.toHaveBeenCalled();
        expect(users.invalidateCaches).not.toHaveBeenCalled();
    });

    it('returns null for a missing user', async () => {
        const { writer } = setup(null);
        await expect(writer.update('u1', { name: 'x' }, 'u1')).resolves.toBeNull();
    });
});

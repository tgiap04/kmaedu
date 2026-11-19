import { RoomCandidatesSchema, RoomOverviewSchema } from './room-candidates.dto';

/** What the query string of the two room-insight routes accepts; anything else is a 400 from the Zod pipe. */
describe('room insight query schemas', () => {
    describe('candidates', () => {
        it('defaults to the first page of ten, and reads numbers from the query string', () => {
            expect(RoomCandidatesSchema.parse({})).toMatchObject({ page: 1, limit: 10 });
            expect(RoomCandidatesSchema.parse({ page: '3', limit: '100' })).toMatchObject({ page: 3, limit: 100 });
        });

        it.each([
            ['page 0', { page: '0' }],
            ['limit above 100', { limit: '101' }],
            ['limit 0', { limit: '0' }],
            ['a status the filter does not offer', { status: 'cancelled' }],
            ['an unknown result', { result: 'maybe' }],
            ['a search longer than 100 characters', { search: 'a'.repeat(101) }],
        ])('refuses %s', (_name, query) => {
            expect(RoomCandidatesSchema.safeParse(query).success).toBe(false);
        });

        it('trims the search', () => {
            expect(RoomCandidatesSchema.parse({ search: '  Đức  ' }).search).toBe('Đức');
        });
    });

    describe('overview', () => {
        it('reads the last 30 minutes unless told otherwise, and refuses other ranges', () => {
            expect(RoomOverviewSchema.parse({}).window).toBe('30m');
            expect(RoomOverviewSchema.parse({ window: '7d' }).window).toBe('7d');
            expect(RoomOverviewSchema.safeParse({ window: '2d' }).success).toBe(false);
        });
    });
});

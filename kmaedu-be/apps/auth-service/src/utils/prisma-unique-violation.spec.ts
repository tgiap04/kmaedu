import { isUniqueViolationOn, uniqueViolationFields } from './prisma-unique-violation';

describe('uniqueViolationFields', () => {
    const adapterError = (fields: string[]) => ({
        code: 'P2002',
        meta: { driverAdapterError: { cause: { constraint: { fields } } } },
    });

    it('reads the columns reported by the pg driver adapter, unquoting camelCase', () => {
        expect(uniqueViolationFields(adapterError(['"userId"']))).toEqual(['userId']);
        expect(isUniqueViolationOn(adapterError(['code']), 'code')).toBe(true);
    });

    it('reads the classic meta.target as array or string', () => {
        expect(uniqueViolationFields({ code: 'P2002', meta: { target: ['email'] } })).toEqual(['email']);
        expect(isUniqueViolationOn({ code: 'P2002', meta: { target: 'username' } }, 'username')).toBe(true);
    });

    it('returns null for anything that is not a P2002', () => {
        expect(uniqueViolationFields(new Error('boom'))).toBeNull();
        expect(uniqueViolationFields(null)).toBeNull();
        expect(isUniqueViolationOn({ code: 'P2003', meta: { target: ['code'] } }, 'code')).toBe(false);
    });

    it('does not match a violation on another column', () => {
        expect(isUniqueViolationOn(adapterError(['"userId"']), 'code')).toBe(false);
        expect(uniqueViolationFields({ code: 'P2002' })).toEqual([]);
    });
});

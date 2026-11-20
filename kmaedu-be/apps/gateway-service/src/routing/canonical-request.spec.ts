import { canonicalMethod, canonicalPath } from './canonical-request';
import { compileRouteTable } from './route-table';

describe('canonicalPath', () => {
    it.each([
        ['/api/v1/x/', '/api/v1/x'],
        ['/api/v1//x', '/api/v1/x'],
        ['//api///v1/x//', '/api/v1/x'],
        ['/', '/'],
        ['//', '/'],
        ['/api/v1/X', '/api/v1/X'], // case is kept: it is matched case-insensitively, never rewritten
    ])('%s -> %s', (input, expected) => {
        expect(canonicalPath(input)).toBe(expected);
    });

    it('is idempotent', () => {
        const once = canonicalPath('//a//b/');
        expect(canonicalPath(once)).toBe(once);
    });
});

describe('canonicalMethod', () => {
    it('serves HEAD as GET and leaves other methods alone', () => {
        expect(canonicalMethod('HEAD')).toBe('GET');
        expect(canonicalMethod('GET')).toBe('GET');
        expect(canonicalMethod('POST')).toBe('POST');
        expect(canonicalMethod('UPGRADE')).toBe('UPGRADE');
    });
});

const table = compileRouteTable(
    {
        upstreams: { up: 'http://up' },
        routes: [
            { id: 'pub', upstream: 'up', match: { path: '/api/v1/auth/(login|verifyAccount)' }, auth: 'none' },
            {
                id: 'api',
                upstream: 'up',
                match: { prefix: '/api/v1' },
                auth: 'required',
                public: [{ method: 'GET', path: '/api/v1/flashcardsets/public/[^/]+' }],
            },
            { id: 'ro', upstream: 'up', match: { prefix: '/api/v1/read' }, methods: ['GET'], auth: 'required' },
        ],
        rateLimits: [
            { id: 'verify', method: 'POST', path: '/api/v1/auth/verifyAccount', window: '60s', max: 5 },
            { id: 'search', method: 'GET', path: '/api/v1/users/search', window: '60s', max: 30 },
            { id: 'ws', method: 'UPGRADE', path: '/ws/study(/.*)?', window: '10s', max: 20 },
        ],
    },
    {}
);

describe('route table sees one canonical request', () => {
    const route = (m: string, p: string) => table.match(m, p)?.id;

    it('case variants hit the same route', () => {
        expect(route('POST', '/API/V1/AUTH/LOGIN')).toBe('pub');
        expect(route('POST', '/api/v1/auth/Verifyaccount')).toBe('pub');
        expect(route('GET', '/Api/V1/Read/x')).toBe('ro');
    });

    it('trailing slash and duplicate slashes hit the same route', () => {
        expect(route('POST', '/api/v1/auth/login/')).toBe('pub');
        expect(route('POST', '//api//v1/auth//login')).toBe('pub');
        expect(route('GET', '/api/v1/read/')).toBe('ro');
    });

    it('HEAD matches a GET-only route', () => {
        expect(route('HEAD', '/api/v1/read/x')).toBe('ro');
        expect(route('HEAD', '/api/v1/auth/login')).toBe('pub');
    });

    it('does not widen what a route allows', () => {
        expect(route('POST', '/api/v1/read/x')).toBe('api');
    });

    it.each([
        '/api/v1/%61uth/login',
        '/api/v1/auth/%6Cogin',
        '/api/v1/auth/log%69n',
        '/api/v1/auth/%2Dx',
        '/api/v1/auth/x%5Fy',
        '/api/v1/auth/x%7Ey',
        '/api/v1/auth/%00',
        '/api/v1/auth%2flogin',
        '/api/v1/auth/%2e%2e/x',
        '/api/v1/auth\\login',
    ])('refuses encoded unreserved characters, NUL, slashes and dots: %s', (p) => {
        expect(table.match('POST', p)).toBeUndefined();
    });

    it('still serves legitimately encoded ids', () => {
        expect(route('GET', '/api/v1/read/a%20b')).toBe('ro');
        expect(route('GET', '/api/v1/read/%E1%BB%87')).toBe('ro');
    });

    it('rate limits apply to every variant of a limited path', () => {
        for (const p of [
            '/api/v1/auth/verifyAccount',
            '/api/v1/auth/verifyaccount',
            '/API/V1/AUTH/VERIFYACCOUNT/',
            '/api//v1/auth/verifyAccount',
        ]) {
            expect(table.rateLimitFor('POST', p)).toMatchObject({ id: 'verify', max: 5 });
        }
        expect(table.rateLimitFor('GET', '/api/v1/users/Search/')).toMatchObject({ id: 'search' });
        expect(table.rateLimitFor('HEAD', '/api/v1/users/search')).toMatchObject({ id: 'search', max: 30 });
        expect(table.rateLimitFor('UPGRADE', '/WS/study/')).toMatchObject({ id: 'ws' });
        expect(table.rateLimitFor('HEAD', '/api/v1/auth/verifyAccount')).toMatchObject({ id: 'default' });
    });

    it('a public exception applies to the same variants the upstream serves', () => {
        const api = table.match('GET', '/api/v1/x')!;
        expect(table.effectiveAuth(api, 'GET', '/api/v1/FlashcardSets/Public/f1/')).toBe('optional');
        expect(table.effectiveAuth(api, 'HEAD', '/api/v1/flashcardsets/public/f1')).toBe('optional');
        expect(table.effectiveAuth(api, 'POST', '/api/v1/flashcardsets/public/f1')).toBe('required');
    });
});

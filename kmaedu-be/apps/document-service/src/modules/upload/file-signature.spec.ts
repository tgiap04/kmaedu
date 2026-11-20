import { detectDocumentType, detectImageType } from './file-signature';

const pdf = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(64, 1)]);
const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(32)]);
const jpeg = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(32)]);
const gif = Buffer.concat([Buffer.from('GIF89a'), Buffer.alloc(32)]);
const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.from([0x24, 0, 0, 0]), Buffer.from('WEBPVP8 '), Buffer.alloc(32)]);
const docx = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), Buffer.from('[Content_Types].xml'), Buffer.from('word/document.xml')]);
const zipWithoutWord = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(26), Buffer.from('password/notes.txt')]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>');
const html = Buffer.from('<!doctype html><script>alert(1)</script>');

describe('detectDocumentType (magic bytes, never the client Content-Type)', () => {
    it.each([
        ['a PDF', pdf, 'application/pdf', 'pdf'],
        ['a DOCX', docx, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'docx'],
        ['plain UTF-8 text', Buffer.from('xin chào\nline two\t.'), 'text/plain', 'txt'],
    ])('accepts %s', (_name, data, mime, ext) => {
        expect(detectDocumentType(data)).toEqual({ mime, ext });
    });

    it.each([
        ['an SVG', svg],
        ['HTML', html],
        ['a PNG', png],
        ['a ZIP that is not a DOCX (a folder named "password")', zipWithoutWord],
        ['an executable (MZ header)', Buffer.concat([Buffer.from('MZ'), Buffer.alloc(64, 1)])],
        ['binary data with NUL bytes', Buffer.alloc(64, 0)],
        ['an empty file', Buffer.alloc(0)],
        ['a PDF header that is not at offset 0', Buffer.concat([Buffer.from('x'), pdf])],
    ])('rejects %s', (_name, data) => {
        expect(detectDocumentType(data)).toBeNull();
    });
});

describe('detectImageType', () => {
    it.each([
        ['PNG', png, 'image/png', 'png'],
        ['JPEG', jpeg, 'image/jpeg', 'jpg'],
        ['GIF', gif, 'image/gif', 'gif'],
        ['WebP', webp, 'image/webp', 'webp'],
    ])('accepts %s', (_name, data, mime, ext) => {
        expect(detectImageType(data)).toEqual({ mime, ext });
    });

    it.each([
        ['an SVG with a script', svg],
        ['HTML', html],
        ['a PDF', pdf],
        ['RIFF that is not WebP (WAV)', Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WAVEfmt ')])],
        ['an empty file', Buffer.alloc(0)],
    ])('rejects %s', (_name, data) => {
        expect(detectImageType(data)).toBeNull();
    });
});

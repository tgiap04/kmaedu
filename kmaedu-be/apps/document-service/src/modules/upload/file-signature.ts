/**
 * Server-side file type detection by magic bytes. The client's Content-Type and filename are never
 * trusted: what is stored (and the Content-Type R2 serves it with) comes from the detected type.
 * Only the types the product needs are recognised; everything else (SVG, HTML, executables, ...) is null.
 */
export interface DetectedType {
    mime: string;
    ext: string;
}

const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const ZIP_LOCAL_HEADER = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const UTF8_BOM = Buffer.from([0xef, 0xbb, 0xbf]);
const JPEG_SIGNATURE = Buffer.from([0xff, 0xd8, 0xff]);

/** A DOCX is a ZIP whose entry names (stored uncompressed in the headers) include the Word parts. */
const DOCX_ENTRY_NAMES = [Buffer.from('word/document.xml'), Buffer.from('word/_rels/')];

const startsWith = (data: Buffer, signature: Buffer, offset = 0): boolean =>
    data.length >= offset + signature.length && data.subarray(offset, offset + signature.length).equals(signature);

const ascii = (data: Buffer, offset: number, text: string): boolean => startsWith(data, Buffer.from(text, 'latin1'), offset);

/**
 * UTF-8 text with no NUL and no control bytes other than tab, CR and LF. Text that opens with `<` is
 * markup (SVG, HTML, XML), which a browser could render as active content, so it is not plain text.
 */
function isPlainText(data: Buffer): boolean {
    if (data.length === 0) return false;
    const body = data.subarray(startsWith(data, UTF8_BOM) ? UTF8_BOM.length : 0);
    if (body.toString('latin1').trimStart().startsWith('<')) return false;
    for (const byte of data) {
        if (byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) return false;
        if (byte === 0x7f) return false;
    }
    try {
        // `stream`: a multi-byte character cut at the end of a leading-bytes sample is not an error.
        new TextDecoder('utf-8', { fatal: true }).decode(data, { stream: true });
        return true;
    } catch {
        return false;
    }
}

/** PDF, DOCX or plain text: what the OCR/text pipeline of ai-service can read. */
export function detectDocumentType(data: Buffer): DetectedType | null {
    if (ascii(data, 0, '%PDF-')) return { mime: 'application/pdf', ext: 'pdf' };
    if (startsWith(data, ZIP_LOCAL_HEADER)) {
        return DOCX_ENTRY_NAMES.some((name) => data.includes(name)) ? { mime: DOCX_MIME, ext: 'docx' } : null;
    }
    return isPlainText(data) ? { mime: 'text/plain', ext: 'txt' } : null;
}

/** PNG, JPEG, WebP or GIF; never SVG. */
export function detectImageType(data: Buffer): DetectedType | null {
    if (startsWith(data, PNG_SIGNATURE)) return { mime: 'image/png', ext: 'png' };
    if (startsWith(data, JPEG_SIGNATURE)) return { mime: 'image/jpeg', ext: 'jpg' };
    if (ascii(data, 0, 'GIF87a') || ascii(data, 0, 'GIF89a')) return { mime: 'image/gif', ext: 'gif' };
    if (ascii(data, 0, 'RIFF') && ascii(data, 8, 'WEBP')) return { mime: 'image/webp', ext: 'webp' };
    return null;
}

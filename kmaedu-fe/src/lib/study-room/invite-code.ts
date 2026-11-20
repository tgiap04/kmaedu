/**
 * Study-room invite code: 8 upper-case letters and digits, without the look-alikes 0/O and 1/I/L
 * (same alphabet as `INVITE_CODE_ALPHABET` in study-room-service). The backend normalises too; this
 * only keeps the input tidy and lets the modal say "8 ký tự" before a request is sent.
 */
export const INVITE_CODE_LENGTH = 8;

// A-H, J, K, M, N, P-Z and 2-9: the alphabet without 0/O and 1/I/L.
const PATTERN = /^[A-HJKMNP-Z2-9]{8}$/;

/** What the user typed, reduced to upper-case ASCII letters and digits, cut at 8 characters. */
export function normalizeInviteCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, INVITE_CODE_LENGTH);
}

export function isInviteCode(value: string): boolean {
  return PATTERN.test(value);
}

/**
 * The sign-up rules of the backend `RegisterSchema` (kmaedu-be/apps/auth-service/src/dto/register.dto.ts),
 * checked before sending so the user gets a precise message instead of a generic "Validation failed".
 * Keep these numbers in step with that schema.
 */
const USERNAME = { min: 3, max: 20 };
const EMAIL_MAX = 50;
/** Shared by every form where a user sets a password (sign-up, reset, change). */
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 100;
/**
 * Same addresses as zod 3's `.email()` (zod/v3/types.js): the local part does not start with a dot,
 * has no "..", and ends in a letter, digit, _, + or -; the domain ends in a 2+ letter TLD.
 */
const EMAIL = /^(?!.*\.\.)(?:[\w'+-][\w'+\-.]*)?[\w+-]@(?:[A-Z0-9][A-Z0-9-]*\.)+[A-Z]{2,}$/i;

export interface RegisterFields {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

/** i18n key of the first broken rule, in form order; null when the form can be sent. */
export function registerProblem(f: RegisterFields): string | null {
  if (f.username.length < USERNAME.min || f.username.length > USERNAME.max) return "signup.error.usernameLength";
  if (!EMAIL.test(f.email)) return "signup.error.emailInvalid";
  if (f.email.length > EMAIL_MAX) return "signup.error.emailTooLong";
  const password = passwordProblem(f.password);
  if (password) return password;
  if (f.password !== f.confirmPassword) return "signup.passwordMismatch";
  return null;
}

/** i18n key when a new password breaks the backend limits (8–100 characters); null when it is fine. */
export function passwordProblem(password: string): string | null {
  if (password.length < PASSWORD_MIN) return "signup.error.passwordTooShort";
  if (password.length > PASSWORD_MAX) return "signup.error.passwordTooLong";
  return null;
}

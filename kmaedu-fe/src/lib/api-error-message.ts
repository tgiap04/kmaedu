interface ErrorBody {
  message: string;
  /** Field problems the backend adds to a validation error: `[{ path, message }]`. */
  details?: unknown;
}

/**
 * Text to show for an API error. A bare "Validation failed" says nothing to the user, so when the
 * backend lists field problems the first one is shown instead.
 */
export function validationMessage(body: ErrorBody): string {
  if (body.message !== "Validation failed" || !Array.isArray(body.details)) return body.message;
  const first = body.details.find((d): d is { message: string } => typeof d?.message === "string" && d.message.length > 0);
  return first ? `Dữ liệu không hợp lệ: ${first.message}` : body.message;
}

/**
 * Text for an error toast: the backend's own message when it sent one for a client error (4xx),
 * otherwise `fallback`. 5xx and network errors keep the fallback: their text is generic English
 * ("Internal server error", "Network Error") that tells the user nothing.
 * Duck-typed on `status` (set by `ApiRequestError` in `apis/api.ts`) so this file stays free of the
 * axios layer, which imports it.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!(error instanceof Error)) return fallback;
  const status = (error as { status?: unknown }).status;
  if (typeof status !== "number" || status < 400 || status >= 500) return fallback;
  return error.message.trim() || fallback;
}

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

/**
 * Time from start to hand-in. GET /examattempts/list sends no spent time, so it is derived the way the
 * server does for its other attempt lists; null while in progress or when a date is unusable.
 */
export function attemptSpentSeconds(startedAt: string, finishedAt: string | null): number | null {
  if (!finishedAt) return null;
  const ms = Date.parse(finishedAt) - Date.parse(startedAt);
  return Number.isFinite(ms) ? Math.max(0, Math.floor(ms / 1000)) : null;
}

/** 1:57:03 past an hour, else 5:07; null stays null. */
export function formatSpent(seconds: number | null): string | null {
  if (seconds === null || !Number.isFinite(seconds)) return null;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ss = s.toString().padStart(2, "0");
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${ss}` : `${m}:${ss}`;
}

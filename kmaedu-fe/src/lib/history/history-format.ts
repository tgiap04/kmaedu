/** Pure formatters for the /k/history library page (Vietnamese copy). */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** "3 ngày trước"; a future date counts as now, an unparsable one gives "". */
export function formatTimeAgo(dateString: string, now: Date = new Date()): string {
  const time = new Date(dateString).getTime();
  if (Number.isNaN(time)) return "";

  const diff = Math.max(0, now.getTime() - time);
  if (diff < MINUTE) return "vừa xong";
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)} phút trước`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)} giờ trước`;
  if (diff < 7 * DAY) return `${Math.floor(diff / DAY)} ngày trước`;
  if (diff < 30 * DAY) return `${Math.floor(diff / (7 * DAY))} tuần trước`;
  if (diff < 365 * DAY) return `${Math.floor(diff / (30 * DAY))} tháng trước`;
  return `${Math.floor(diff / (365 * DAY))} năm trước`;
}

export type ScoreTone = "good" | "fair" | "poor";

/** Colour band of a score percentage: green from 80, amber from 60, red below. */
export function scoreTone(percent: number): ScoreTone {
  if (percent >= 80) return "good";
  if (percent >= 60) return "fair";
  return "poor";
}

/** "512 KB" below one MB (a non-empty file never shows 0 KB), "2.4 MB" from there. */
export function formatFileSize(bytes: number): string {
  if (!bytes) return "0 KB";
  const mb = bytes / 1024 / 1024;
  return mb >= 1 ? `${mb.toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

/** "999", "1.2k", "856k", "1.5M" (no trailing ".0"). */
export function formatCompactCount(value: number): string {
  const short = (n: number, unit: string) => `${Number(n.toFixed(1))}${unit}`;
  if (value >= 1_000_000) return short(value / 1_000_000, "M");
  if (value >= 1000) return short(value / 1000, "k");
  return String(value);
}

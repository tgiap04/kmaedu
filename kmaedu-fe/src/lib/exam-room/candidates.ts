import { format } from "date-fns";
import type { CandidateStatus, RoomCandidate, RoomCandidatesResponse } from "@/apis/examAttemptApi";
import { displayUserName } from "@/lib/user/display-user-name";

export const CANDIDATE_STATUS_LABEL: Record<CandidateStatus, string> = {
  submitted: "Đã nộp",
  in_progress: "Đang làm",
  not_started: "Chưa bắt đầu",
  cancelled: "Đã hủy",
};

/** "45 giây", "2 phút", "1 giờ 5 phút"; a dash when there is nothing to time. */
export function formatTimeSpent(seconds: number | null): string {
  if (seconds === null) return "–";
  if (seconds < 60) return `${seconds} giây`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} giờ ${m} phút` : `${h} giờ`;
}

/** The server's largest page; an export reads pages of this size one after another. */
const EXPORT_PAGE = 100;
/** 5 000 candidates: far beyond a class, and a bound on how many requests one click can make. */
const EXPORT_MAX_PAGES = 50;

/**
 * Every candidate, page by page. A live room can move under the read (someone starts a retake and moves to the
 * end): a row a later page repeats is dropped, and a read that changed size or came back short is refused
 * rather than exported with a row missing.
 */
export async function readAllCandidates(fetchPage: (page: number, limit: number) => Promise<RoomCandidatesResponse>): Promise<RoomCandidate[]> {
  const first = await fetchPage(1, EXPORT_PAGE);
  if (first.totalPages > EXPORT_MAX_PAGES) throw new Error("Phòng có quá nhiều thí sinh để xuất một lần");
  const rows = new Map(first.candidates.map((c) => [c.userId, c]));
  for (let page = 2; page <= first.totalPages; page += 1) {
    const next = await fetchPage(page, EXPORT_PAGE);
    if (next.total !== first.total) throw new Error("Danh sách thí sinh vừa thay đổi trong lúc xuất, hãy xuất lại");
    for (const c of next.candidates) if (!rows.has(c.userId)) rows.set(c.userId, c);
  }
  // A reorder (a retake moves its candidate to the end) can skip a row while the total stays the same.
  if (rows.size !== first.total) throw new Error("Danh sách thí sinh vừa thay đổi trong lúc xuất, hãy xuất lại");
  return [...rows.values()];
}

const stamp = (value: string | null) => (value ? format(new Date(value), "dd/MM/yyyy HH:mm") : "");

/** One CSV cell: a leading = + - @ is defused so a spreadsheet shows it instead of running it, then RFC 4180 quoting. */
function cell(value: string | number): string {
  let text = String(value);
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const HEADER = ["STT", "Thí sinh", "Tên đăng nhập", "Trạng thái", "Bắt đầu làm", "Nộp bài lúc", "Điểm (%)", "Kết quả", "Thời gian làm", "Số lần làm"];

/** The candidate list as a CSV Excel opens in UTF-8 (BOM first). */
export function candidatesCsv(rows: readonly RoomCandidate[]): string {
  const lines = rows.map((c, i) => [
    i + 1,
    displayUserName(c.user),
    c.user?.username ?? "",
    CANDIDATE_STATUS_LABEL[c.status],
    stamp(c.startedAt),
    stamp(c.finishedAt),
    c.score ?? "",
    c.passed === null ? "" : c.passed ? "Đạt" : "Chưa đạt",
    c.timeSpentSeconds === null ? "" : formatTimeSpent(c.timeSpentSeconds),
    c.attemptCount,
  ]);
  return `\uFEFF${[HEADER, ...lines].map((line) => line.map(cell).join(",")).join("\r\n")}`;
}

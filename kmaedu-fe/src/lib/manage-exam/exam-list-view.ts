const WINDOW = 3;

/** Page numbers to show: at most three, kept around the current page. */
export function pageWindow(current: number, total: number): number[] {
  if (total <= 0) return [];
  const size = Math.min(WINDOW, total);
  const start = Math.min(Math.max(1, current - 1), total - size + 1);
  return Array.from({ length: size }, (_, i) => start + i);
}

/** 1-based index of the first and last row on this page ("Hiển thị a – b"). */
export function resultRange(page: number, perPage: number, total: number) {
  if (total <= 0) return { from: 0, to: 0 };
  return { from: (page - 1) * perPage + 1, to: Math.min(page * perPage, total) };
}

export function toggleOne(selected: Set<string>, id: string): Set<string> {
  const next = new Set(selected);
  if (next.has(id)) next.delete(id);
  else next.add(id);
  return next;
}

/** Header checkbox: select every id on the page, or clear them when all are already selected. */
export function toggleAll(selected: Set<string>, ids: string[]): Set<string> {
  if (ids.length === 0) return selected;
  const next = new Set(selected);
  const allSelected = ids.every((id) => next.has(id));
  for (const id of ids) {
    if (allSelected) next.delete(id);
    else next.add(id);
  }
  return next;
}

/**
 * One line after deleting several exams: success when all went, a warning with the count when only
 * part went, nothing when none went (the store already reported each failure with its reason).
 */
export function bulkDeleteSummary(deleted: number, total: number): { kind: "success" | "warning"; text: string } | null {
  if (deleted === 0) return null;
  if (deleted === total) return { kind: "success", text: total === 1 ? "Đã xóa đề thi" : `Đã xóa ${total} đề thi` };
  return { kind: "warning", text: `Đã xóa ${deleted}/${total} đề thi, phần còn lại thất bại` };
}

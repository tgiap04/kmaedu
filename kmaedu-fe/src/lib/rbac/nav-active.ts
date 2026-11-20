/**
 * Whether a sidebar item is lit for this path (an item owns its detail pages too). `visibleIds` are the
 * items this user sees: a practice page belongs to "Quản lý Đề thi" for whoever has it (the owner's
 * preview), otherwise to "Tài liệu của tôi", where a learner opened it — never both at once.
 */
export function isNavActive(id: string, path: string, visibleIds: readonly string[]): boolean {
  const practice = path.startsWith("/k/practice-quiz");
  switch (id) {
    case "word-family":
      return path.startsWith("/k/word-family");
    case "my-materials":
      return path === "/k/my-materials" || (practice && !visibleIds.includes("manage-exam"));
    case "manage-exam":
      return path === "/k/manage-exam" || path.startsWith("/k/manage-quiz-set") || practice;
    case "flash-card":
      return path === "/k/flash-card" || path.startsWith("/k/manage-flashcard-set");
    case "manage-exam-room":
      return path.startsWith("/k/manage-exam-room");
    case "study-room":
      return path.startsWith("/k/study-room");
    case "history":
      return path === "/k/history" || path.startsWith("/k/history/");
    case "admin":
      return path === "/admin";
    default:
      return path === `/k/${id}`;
  }
}

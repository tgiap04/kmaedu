import { useState } from "react";
import { PencilSimpleIcon, PlusCircleIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import type { ExamChapter } from "@/lib/manage-exam/exam-chapters";
import { cn } from "@/lib/utils";
import { ChapterColorMenu } from "./chapter-color-menu";

interface Props {
  chapters: ExamChapter[];
  activeId: string | null;
  countOf: (chapterId: string) => number;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onRename: (id: string, name: string) => void;
  onRecolor: (id: string, color: string) => void;
  onRemove: (id: string) => void;
}

const iconBtn = "grid size-6 place-items-center rounded-full text-body transition-colors hover:bg-canvas hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** Chapters of the open file: pick the one new ticks go into, recolour, rename, remove, add more. */
export function FileChapterBar({ chapters, activeId, countOf, onSelect, onAdd, onRename, onRecolor, onRemove }: Props) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const startEdit = (c: ExamChapter) => {
    setEditing(c.id);
    setDraft(c.name);
  };
  const save = () => {
    if (editing) onRename(editing, draft);
    setEditing(null);
  };

  return (
    <div className="mt-4 rounded-lg bg-surface-soft p-3 md:p-4">
      <p className="text-[14px] font-semibold text-ink">Chương trong file này</p>
      <p className="mt-0.5 text-[13px] text-body">Câu bạn tích sẽ vào chương đang chọn. Câu đã tích có thể chuyển chương ở cuối mỗi dòng.</p>
      <div className="mt-3 flex flex-wrap gap-2" role="radiogroup" aria-label="Chương đang chọn">
        {chapters.map((c) => {
          const active = c.id === activeId;
          if (editing === c.id) {
            return (
              <span key={c.id} className="inline-flex h-9 items-center gap-1 rounded-lg border border-brand bg-canvas pl-3 pr-1">
                <input
                  autoFocus
                  value={draft}
                  maxLength={100}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") save();
                    if (e.key === "Escape") setEditing(null);
                  }}
                  onBlur={save}
                  aria-label="Tên chương"
                  className="w-40 bg-transparent text-[14px] text-ink outline-none"
                />
                <button type="button" aria-label="Lưu tên chương" onMouseDown={(e) => e.preventDefault()} onClick={save} className={iconBtn}>
                  <CheckIcon className="size-3.5" aria-hidden />
                </button>
              </span>
            );
          }
          return (
            <span
              key={c.id}
              className={cn(
                "inline-flex h-9 items-center gap-1 rounded-lg border pl-1 pr-1 transition-colors",
                active ? "border-brand bg-brand-soft" : "border-hairline bg-canvas",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => onSelect(c.id)}
                className={cn("inline-flex h-7 max-w-56 items-center gap-2 rounded-lg px-2 text-[14px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40", active ? "text-brand" : "text-ink")}
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: c.color }} aria-hidden />
                <span className="truncate">{c.name}</span>
                <span className="text-muted-foreground">({countOf(c.id)})</span>
              </button>
              <ChapterColorMenu name={c.name} value={c.color} onChange={(color) => onRecolor(c.id, color)} className={iconBtn} />
              <button type="button" aria-label={`Đổi tên ${c.name}`} onClick={() => startEdit(c)} className={iconBtn}>
                <PencilSimpleIcon className="size-3.5" aria-hidden />
              </button>
              {chapters.length > 1 && (
                <button type="button" aria-label={`Xóa ${c.name}`} onClick={() => onRemove(c.id)} className={iconBtn}>
                  <XIcon className="size-3.5" aria-hidden />
                </button>
              )}
            </span>
          );
        })}
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-dashed border-brand-border px-4 text-[14px] font-medium text-brand transition-colors hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <PlusCircleIcon className="size-4" aria-hidden />
          Thêm chương
        </button>
      </div>
    </div>
  );
}

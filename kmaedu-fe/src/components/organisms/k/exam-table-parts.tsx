import { EyeIcon, FileTextIcon, DotsThreeCircleVerticalIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import type { ExamStatus } from "@/components/atoms/k/ExamStatusBadge";
import { cn } from "@/lib/utils";

export interface ExamTableData {
  id: string;
  name: string;
  description: string;
  questionCount: number;
  status: ExamStatus;
  createdDate: string;
  createdTime: string;
  lastStudied: string | null;
  tags: string[];
}

export interface ExamRowHandlers {
  onView: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

const statusPill: Record<ExamStatus, { label: string; className: string }> = {
  public: { label: "Công khai", className: "bg-emerald-50 text-emerald-700" },
  private: { label: "Riêng tư", className: "bg-amber-50 text-amber-700" },
  draft: { label: "Nháp", className: "bg-surface-card text-body" },
};

export function ExamStatusPill({ status }: { status: ExamStatus }) {
  const { label, className } = statusPill[status];
  return <span className={cn("inline-flex rounded-lg px-3 py-1 text-[13px] font-medium", className)}>{label}</span>;
}

export function ExamIconTile() {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
      <FileTextIcon className="size-5" aria-hidden />
    </span>
  );
}

/** Secondary line under the title: the description, else the tags, else a hint. */
export function examSubtitle(exam: ExamTableData) {
  if (exam.description) return exam.description;
  if (exam.tags.length > 0) return exam.tags.map((t) => `#${t}`).join(" ");
  return "Chưa có mô tả";
}

const outlineBtn =
  "inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3 text-[14px] font-medium text-ink transition-colors hover:border-brand-border hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** Xem / Sửa outline buttons plus the ⋮ menu (Sửa, Xóa), as in the mock. */
export function ExamRowActions({ exam, handlers }: { exam: ExamTableData; handlers: ExamRowHandlers }) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button type="button" onClick={() => handlers.onView(exam.id)} className={outlineBtn}>
        <EyeIcon className="size-4" aria-hidden />
        Xem
      </button>
      <button type="button" onClick={() => handlers.onEdit(exam.id)} className={outlineBtn}>
        <PencilSimpleIcon className="size-4" aria-hidden />
        Sửa
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tùy chọn cho ${exam.name}`}
            className="ml-1 grid size-9 place-items-center rounded-lg text-body transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <DotsThreeCircleVerticalIcon className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handlers.onEdit(exam.id)} className="cursor-pointer">
            <PencilSimpleIcon className="mr-2 size-4" aria-hidden />
            Chỉnh sửa
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handlers.onDelete(exam.id)} className="cursor-pointer text-destructive focus:text-destructive">
            <TrashIcon className="mr-2 size-4" aria-hidden />
            Xóa
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function SelectBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChange}
      aria-label={label}
      className="size-[18px] cursor-pointer rounded-lg border-hairline accent-[var(--brand)]"
    />
  );
}

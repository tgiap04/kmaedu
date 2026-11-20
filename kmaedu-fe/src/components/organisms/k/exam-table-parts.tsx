import { EyeIcon, FileTextIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
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

const iconBtn =
  "grid size-9 place-items-center rounded-lg border border-hairline bg-canvas text-body transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&_svg]:size-4";

/** View, edit and delete as icon-only buttons: the tooltip says the action, the accessible name the action and the set. */
export function ExamRowActions({ exam, handlers }: { exam: ExamTableData; handlers: ExamRowHandlers }) {
  const actions = [
    { label: "Xem", icon: <EyeIcon aria-hidden />, onClick: handlers.onView, tone: "hover:border-brand-border hover:bg-brand-soft hover:text-brand" },
    { label: "Sửa", icon: <PencilSimpleIcon aria-hidden />, onClick: handlers.onEdit, tone: "hover:border-brand-border hover:bg-brand-soft hover:text-brand" },
    { label: "Xóa", icon: <TrashIcon aria-hidden />, onClick: handlers.onDelete, tone: "hover:border-destructive/40 hover:bg-destructive/10 hover:text-destructive" },
  ];
  return (
    <div className="flex items-center justify-end gap-1.5">
      {actions.map(({ label, icon, onClick, tone }) => (
        <button
          key={label}
          type="button"
          onClick={() => onClick(exam.id)}
          aria-label={`${label} ${exam.name}`}
          title={label}
          className={cn(iconBtn, tone)}
        >
          {icon}
        </button>
      ))}
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

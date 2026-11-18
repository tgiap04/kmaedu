import { Link } from "react-router-dom";
import { CopyIcon, GlobeIcon, CircleNotchIcon, LockSimpleIcon, PencilSimpleIcon, TrashIcon, ExamIcon, CaretRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import type { QuizSet } from "@/types/quizset";

interface Props {
  quizSet: QuizSet;
  copying: boolean;
  onEditInfo: () => void;
  onShare: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const actionBtn =
  "grid size-11 place-items-center rounded-lg border bg-canvas shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60";

/** Breadcrumb, file tile, title (+ edit), visibility pill (opens sharing), description, copy / delete icons. */
export function QuizSetDetailHeader({ quizSet, copying, onEditInfo, onShare, onCopy, onDelete }: Props) {
  return (
    <header>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px]">
        <Link to="/k/manage-exam" className="text-body transition-colors hover:text-ink">Quản lý đề thi</Link>
        <CaretRightIcon className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium text-ink" aria-current="page">Chi tiết đề thi</span>
      </nav>

      <div className="mt-4 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-[72px] shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand shadow-[0_8px_20px_rgba(238,47,43,0.10)]">
            <ExamIcon className="size-8" weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="min-w-0 truncate text-2xl font-bold tracking-tight text-ink lg:text-[28px]">{quizSet.title}</h1>
              <button type="button" onClick={onEditInfo} aria-label="Sửa tên đề thi" className="grid size-8 place-items-center rounded-full text-body transition-colors hover:bg-surface-soft hover:text-ink">
                <PencilSimpleIcon className="size-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onShare}
                title="Chia sẻ đề thi"
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft"
              >
                {quizSet.isPublic ? <GlobeIcon className="size-4" aria-hidden /> : <LockSimpleIcon className="size-4" aria-hidden />}
                {quizSet.isPublic ? "Công khai" : "Riêng tư"}
              </button>
            </div>
            <p className="mt-1.5 line-clamp-1 text-[15px] text-body">
              {quizSet.description?.trim() ? quizSet.description : <span className="text-muted-foreground">Chưa có mô tả</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onCopy} disabled={copying} aria-label="Sao chép đề thi" title="Sao chép đề thi" className={cn(actionBtn, "border-hairline text-ink hover:bg-surface-soft")}>
            {copying ? <CircleNotchIcon className="size-[18px] animate-spin" aria-hidden /> : <CopyIcon className="size-[18px]" aria-hidden />}
          </button>
          <button type="button" onClick={onDelete} aria-label="Xóa đề thi" title="Xóa đề thi" className={cn(actionBtn, "border-brand-border text-brand hover:bg-brand-soft")}>
            <TrashIcon className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    </header>
  );
}

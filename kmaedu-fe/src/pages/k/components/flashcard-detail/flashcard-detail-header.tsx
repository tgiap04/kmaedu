import { Link } from "react-router-dom";
import {
  BookOpenTextIcon,
  CaretRightIcon,
  CardsIcon,
  CircleNotchIcon,
  CopyIcon,
  FolderIcon,
  GlobeIcon,
  type Icon,
  ListChecksIcon,
  LockSimpleIcon,
  NotebookIcon,
  PencilSimpleIcon,
  ShareNetworkIcon,
  StackIcon,
  TrashIcon,
} from "@phosphor-icons/react";
import { stableIndex } from "@/lib/stable-index";
import { cn } from "@/lib/utils";
import type { FlashcardSet } from "@/types/flashcardSet";

/** Sets carry no cover image, so each one gets a fixed icon picked from its id. */
const TILE_ICONS: Icon[] = [CardsIcon, StackIcon, NotebookIcon, BookOpenTextIcon, ListChecksIcon, FolderIcon];

interface Props {
  set: FlashcardSet;
  copying: boolean;
  /** The cards are not loaded (yet, or the read failed): there is nothing to copy. */
  copyDisabled: boolean;
  onEditInfo: () => void;
  onShare: () => void;
  onCopy: () => void;
  onDelete: () => void;
}

const actionBtn =
  "inline-flex h-9 items-center gap-2 rounded-lg border bg-canvas px-3.5 text-[14px] font-medium shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60";

/** Breadcrumb, set tile, title (+ edit), description, visibility pill (opens sharing) and Chia sẻ / Sao chép / Xóa. */
export function FlashcardDetailHeader({ set, copying, copyDisabled, onEditInfo, onShare, onCopy, onDelete }: Props) {
  const TileIcon = TILE_ICONS[stableIndex(set.id, TILE_ICONS.length)];
  const description = set.description?.trim();
  return (
    <header>
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[14px]">
        <Link to="/k/flash-card" className="text-body transition-colors hover:text-ink">Quản lý Flashcard</Link>
        <CaretRightIcon className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium text-ink" aria-current="page">Chi tiết bộ thẻ</span>
      </nav>

      <div className="mt-3 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-14 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand shadow-[0_8px_20px_rgba(238,47,43,0.10)]">
            <TileIcon className="size-6" weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <h1 className="min-w-0 break-words text-2xl font-bold tracking-tight text-ink lg:text-[28px] lg:leading-9">{set.title}</h1>
              <button type="button" onClick={onEditInfo} aria-label="Sửa thông tin bộ thẻ" title="Sửa thông tin bộ thẻ" className="grid size-8 place-items-center rounded-full text-body transition-colors hover:bg-surface-soft hover:text-ink">
                <PencilSimpleIcon className="size-[18px]" aria-hidden />
              </button>
              <button
                type="button"
                onClick={onShare}
                title="Chia sẻ bộ thẻ"
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-[13px] font-medium transition-colors",
                  set.isPublic ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100" : "border-hairline bg-surface-soft text-body hover:bg-surface-card",
                )}
              >
                {set.isPublic ? <GlobeIcon className="size-3.5" aria-hidden /> : <LockSimpleIcon className="size-3.5" aria-hidden />}
                {set.isPublic ? "Công khai" : "Riêng tư"}
              </button>
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <p className="line-clamp-2 text-[15px] text-body">{description || <span className="text-muted-foreground">Chưa có mô tả</span>}</p>
              {(set.tags ?? []).length > 0 && (
                <ul className="flex flex-wrap gap-1.5" aria-label="Thẻ của bộ">
                  {set.tags.map((tag) => (
                    <li key={tag} className="rounded-lg border border-hairline bg-surface-soft px-2 py-0.5 text-[12px] text-body">{tag}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button type="button" onClick={onShare} className={cn(actionBtn, "border-hairline text-ink hover:bg-surface-soft")}>
            <ShareNetworkIcon className="size-4" aria-hidden />
            Chia sẻ
          </button>
          <button type="button" onClick={onCopy} disabled={copying || copyDisabled} title={copyDisabled ? "Chưa tải xong danh sách thẻ" : undefined} className={cn(actionBtn, "border-hairline text-ink hover:bg-surface-soft")}>
            {copying ? <CircleNotchIcon className="size-4 animate-spin" aria-hidden /> : <CopyIcon className="size-4" aria-hidden />}
            Sao chép
          </button>
          <button type="button" onClick={onDelete} className={cn(actionBtn, "border-brand-border text-brand hover:bg-brand-soft")}>
            <TrashIcon className="size-4" aria-hidden />
            Xóa
          </button>
        </div>
      </div>
    </header>
  );
}

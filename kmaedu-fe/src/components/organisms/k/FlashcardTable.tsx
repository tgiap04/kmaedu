import { memo } from "react";
import { PushPinIcon } from "@phosphor-icons/react";
import type { FlashcardRow, FlashcardRowHandlers } from "@/pages/k/components/flashcard-list/flashcard-row";
import { RowActions } from "@/pages/k/components/flashcard-list/row-actions";
import { SetTile } from "@/pages/k/components/flashcard-list/set-tile";
import { CategoryPill, StatusPill } from "@/pages/k/components/flashcard-list/set-pills";

export type FlashcardTableData = FlashcardRow;

interface FlashcardTableProps extends FlashcardRowHandlers {
  flashcards: FlashcardTableData[];
}

/** Wide table above ~900px of card width; ~670px keeps actions beside the text; narrower stacks the actions under it. */
const COLUMNS = "grid-cols-1 @2xl:grid-cols-[minmax(0,1fr)_auto] @4xl:grid-cols-[minmax(0,2.4fr)_minmax(0,1.1fr)_56px_72px_96px_96px_158px]";

function TableRow({ row, handlers }: { row: FlashcardTableData; handlers: FlashcardRowHandlers }) {
  return (
    <div role="row" className={`grid min-h-[66px] items-center gap-x-3 px-4 py-2.5 transition-colors hover:bg-surface-soft/60 md:px-5 ${COLUMNS}`}>
      <div role="cell" className="flex min-w-0 items-center gap-3">
        <SetTile id={row.id} />
        <div className="min-w-0">
          <button
            type="button"
            onClick={() => handlers.onManage(row.id)}
            title={row.name}
            className="flex max-w-full items-center gap-1.5 text-left text-[14px] font-semibold text-ink hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {row.isPinned && <PushPinIcon className="size-3.5 shrink-0 text-brand" aria-hidden={false} role="img" aria-label="Đã ghim" />}
            <span className="truncate">{row.name}</span>
          </button>
          {row.description && <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{row.description}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 @4xl:hidden">
            <CategoryPill tags={row.tags} />
            <StatusPill isPublic={row.isPublic} />
          </div>
          <p className="mt-1 text-[12px] text-muted-foreground @4xl:hidden">
            {row.cardCount} thẻ • {row.viewCount} lượt xem • {row.createdDate}
          </p>
        </div>
      </div>
      <div role="cell" className="hidden min-w-0 @4xl:block">
        <CategoryPill tags={row.tags} />
      </div>
      <span role="cell" className="hidden text-center text-[14px] tabular-nums text-ink @4xl:block">{row.cardCount}</span>
      <span role="cell" className="hidden text-center text-[14px] tabular-nums text-ink @4xl:block">{row.viewCount}</span>
      <span role="cell" className="hidden text-center text-[13px] tabular-nums text-body @4xl:block">{row.createdDate}</span>
      <div role="cell" className="hidden @4xl:block">
        <StatusPill isPublic={row.isPublic} />
      </div>
      <div role="cell" className="min-w-0">
        <RowActions row={row} handlers={handlers} className="mt-2 pl-[52px] @2xl:mt-0 @2xl:justify-end @2xl:pl-0" />
      </div>
    </div>
  );
}

const FlashcardTableComponent = ({ flashcards, ...handlers }: FlashcardTableProps) => (
  <div role="table" aria-label="Danh sách bộ flashcard" className="@container divide-y divide-hairline-soft">
    <div role="row" className={`hidden items-center gap-x-3 px-4 py-2 text-[13px] font-medium text-muted-foreground md:px-5 @4xl:grid ${COLUMNS}`}>
      <span role="columnheader">Tên bộ thẻ</span>
      <span role="columnheader">Danh mục</span>
      <span role="columnheader" className="text-center">Số thẻ</span>
      <span role="columnheader" className="text-center">Lượt xem</span>
      <span role="columnheader" className="text-center">Ngày tạo</span>
      <span role="columnheader">Trạng thái</span>
      <span role="columnheader" className="text-right">Thao tác</span>
    </div>
    {flashcards.map((row) => (
      <TableRow key={row.id} row={row} handlers={handlers} />
    ))}
  </div>
);

FlashcardTableComponent.displayName = "FlashcardTable";

export const FlashcardTable = memo(FlashcardTableComponent);

import { CalendarBlankIcon, CardsIcon, EyeIcon, PushPinIcon } from "@phosphor-icons/react";
import { RowActions } from "./row-actions";
import { SetTile } from "./set-tile";
import { CategoryPill, StatusPill } from "./set-pills";
import type { FlashcardRow, FlashcardRowHandlers } from "./flashcard-row";

function GridCard({ row, handlers }: { row: FlashcardRow; handlers: FlashcardRowHandlers }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-hairline bg-canvas p-4 transition-colors hover:border-brand-border">
      <div className="flex items-start gap-3">
        <SetTile id={row.id} size="lg" />
        <div className="min-w-0 flex-1">
          <h3 className="line-clamp-2 text-base font-semibold leading-snug text-ink">
            <button
              type="button"
              onClick={() => handlers.onManage(row.id)}
              className="text-left hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              {row.isPinned && <PushPinIcon className="mr-1 inline size-3.5 align-[-1px] text-brand" aria-hidden={false} role="img" aria-label="Đã ghim" />}
              {row.name}
            </button>
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[12px] text-muted-foreground">{row.description || "Chưa có mô tả"}</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <CategoryPill tags={row.tags} />
        <StatusPill isPublic={row.isPublic} />
      </div>
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-body [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
        <div className="inline-flex items-center gap-1.5"><dt className="sr-only">Số thẻ</dt><CardsIcon /><dd>{row.cardCount} thẻ</dd></div>
        <div className="inline-flex items-center gap-1.5"><dt className="sr-only">Lượt xem</dt><EyeIcon /><dd>{row.viewCount}</dd></div>
        <div className="inline-flex items-center gap-1.5"><dt className="sr-only">Ngày tạo</dt><CalendarBlankIcon /><dd>{row.createdDate}</dd></div>
      </dl>
      <RowActions row={row} handlers={handlers} className="mt-auto justify-end border-t border-hairline-soft pt-3" />
    </article>
  );
}

/** Grid view: one compact card per set with the same information and actions as a table row. */
export function FlashcardGrid({ flashcards, ...handlers }: { flashcards: FlashcardRow[] } & FlashcardRowHandlers) {
  return (
    <div className="@container p-4">
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {flashcards.map((row) => (
          <GridCard key={row.id} row={row} handlers={handlers} />
        ))}
      </div>
    </div>
  );
}

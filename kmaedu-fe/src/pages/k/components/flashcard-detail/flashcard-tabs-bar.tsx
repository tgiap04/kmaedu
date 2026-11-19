import type { KeyboardEvent } from "react";
import { CaretCircleDownIcon, CheckCircleIcon, FunnelIcon, MagnifyingGlassIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import type { FlashcardSetLabel } from "@/apis/flashcardSetApi";
import { ALL_CARDS, UNLABELED, nextTabIndex } from "@/lib/flashcard-detail/flashcard-detail";
import { cn } from "@/lib/utils";

export type DetailTab = "cards" | "stats" | "labels";

interface Props {
  tab: DetailTab;
  onTabChange: (tab: DetailTab) => void;
  /** null while the cards load: the count is left out. */
  cardCount: number | null;
  search: string;
  onSearchChange: (v: string) => void;
  labels: FlashcardSetLabel[];
  label: string;
  onLabelChange: (v: string) => void;
}

export const tabId = (tab: DetailTab) => `flashcard-detail-tab-${tab}`;
export const tabPanelId = (tab: DetailTab) => `flashcard-detail-panel-${tab}`;

const TABS: { key: DetailTab; text: string }[] = [
  { key: "cards", text: "Danh sách thẻ" },
  { key: "stats", text: "Thống kê học tập" },
  { key: "labels", text: "Nhãn" },
];

/** Underlined tabs; on the card tab also the search box and the label filter ("Bộ lọc"). */
export function FlashcardTabsBar({ tab, onTabChange, cardCount, search, onSearchChange, labels, label, onLabelChange }: Props) {
  const filters = [
    { value: ALL_CARDS, text: "Tất cả thẻ", color: null },
    { value: UNLABELED, text: "Chưa gán nhãn", color: null },
    ...labels.map((l) => ({ value: l.id, text: l.name, color: l.color })),
  ];
  const active = filters.find((f) => f.value === label);

  // Arrow keys / Home / End move between the tabs and select them (the selected tab is the only one in the tab order).
  const onTabKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const to = nextTabIndex(e.key, index, TABS.length);
    if (to === null) return;
    e.preventDefault();
    onTabChange(TABS[to].key);
    document.getElementById(tabId(TABS[to].key))?.focus();
  };

  return (
    <div className="flex flex-col gap-3 border-b border-hairline-soft lg:flex-row lg:items-end lg:justify-between">
      <div role="tablist" aria-label="Nội dung bộ thẻ" className="-mb-px flex gap-4 overflow-x-auto sm:gap-6">
        {TABS.map((t, i) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            id={tabId(t.key)}
            aria-selected={tab === t.key}
            aria-controls={tab === t.key ? tabPanelId(t.key) : undefined}
            tabIndex={tab === t.key ? 0 : -1}
            onClick={() => onTabChange(t.key)}
            onKeyDown={(e) => onTabKeyDown(e, i)}
            className={cn(
              "shrink-0 border-b-[3px] px-1 pb-3 pt-1 text-[14px] font-medium transition-colors sm:text-[15px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              tab === t.key ? "border-brand font-semibold text-brand" : "border-transparent text-body hover:text-ink",
            )}
          >
            {t.text}
            {t.key === "cards" && cardCount !== null && <span className={cn("ml-1 hidden font-normal sm:inline", tab === t.key ? "text-brand/80" : "text-muted-foreground")}>({cardCount})</span>}
          </button>
        ))}
      </div>

      {tab === "cards" && (
        <div className="flex items-center gap-2 pb-3">
          <label className="relative min-w-0 flex-1 lg:w-72 lg:flex-initial">
            <span className="sr-only">Tìm kiếm trong bộ thẻ</span>
            <MagnifyingGlassIcon className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-soft" aria-hidden />
            <input
              type="search"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Tìm kiếm trong bộ thẻ..."
              className="h-9 w-full rounded-lg border border-hairline bg-canvas pl-10 pr-4 text-[14px] outline-none placeholder:text-muted-soft focus:border-brand-border"
            />
          </label>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "inline-flex h-9 max-w-52 shrink-0 items-center gap-2 rounded-lg border px-3.5 text-[14px] font-medium transition-colors hover:bg-surface-soft",
                  label === ALL_CARDS ? "border-hairline text-ink" : "border-brand-border bg-brand-soft text-brand",
                )}
              >
                <FunnelIcon className="size-4 shrink-0" aria-hidden />
                <span className="truncate">{label === ALL_CARDS ? "Bộ lọc" : (active?.text ?? "Bộ lọc")}</span>
                <CaretCircleDownIcon className="size-4 shrink-0" aria-hidden />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {filters.map((f) => (
                <DropdownMenuItem key={f.value} onClick={() => onLabelChange(f.value)} className="cursor-pointer">
                  <CheckCircleIcon className={cn("mr-2 size-4 shrink-0", f.value === label ? "text-brand" : "invisible")} aria-hidden />
                  {f.color && <span className="mr-2 size-2.5 shrink-0 rounded-full" style={{ backgroundColor: f.color }} />}
                  <span className="max-w-64 truncate">{f.text}</span>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      )}
    </div>
  );
}

import type { KeyboardEvent } from "react";
import type { Icon } from "@phosphor-icons/react";
import { nextTabIndex } from "@/lib/flashcard-detail/flashcard-detail";
import { cn } from "@/lib/utils";

export interface SourceTab<K extends string> {
  key: K;
  label: string;
  icon: Icon;
}

/** The three ways to make a set, as an underlined tab row (only the tabs the viewer may use are passed in). */
export function SourceTabs<K extends string>({ tabs, active, onChange, disabled }: { tabs: SourceTab<K>[]; active: K; onChange: (key: K) => void; disabled?: boolean }) {
  // Arrow keys / Home / End move between the tabs and select them (the selected tab is the only one in the tab order).
  const onKeyDown = (e: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const to = nextTabIndex(e.key, index, tabs.length);
    if (to === null) return;
    e.preventDefault();
    onChange(tabs[to].key);
    document.getElementById(`flashcard-tab-${tabs[to].key}`)?.focus();
  };

  return (
    <div role="tablist" aria-label="Nguồn tạo flashcard" className="flex gap-1 overflow-x-auto border-b border-hairline-soft px-2 md:px-3">
      {tabs.map(({ key, label, icon: TabIcon }, index) => {
        const on = key === active;
        return (
          <button
            key={key}
            type="button"
            role="tab"
            id={`flashcard-tab-${key}`}
            aria-selected={on}
            aria-controls={on ? `flashcard-panel-${key}` : undefined}
            tabIndex={on ? 0 : -1}
            disabled={disabled}
            onClick={() => onChange(key)}
            onKeyDown={(e) => onKeyDown(e, index)}
            className={cn(
              "-mb-px inline-flex h-12 shrink-0 items-center gap-2 border-b-2 px-3 text-[14px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-60 md:px-4",
              on ? "border-brand text-brand" : "border-transparent text-body hover:text-ink",
            )}
          >
            <TabIcon className="size-5" weight={on ? "duotone" : "regular"} aria-hidden />
            {label}
          </button>
        );
      })}
    </div>
  );
}

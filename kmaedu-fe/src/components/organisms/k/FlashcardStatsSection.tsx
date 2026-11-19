import { memo } from "react";
import { CardsIcon, ChartBarIcon, EyeIcon, FoldersIcon, type Icon } from "@phosphor-icons/react";
import { DecorativeIcons } from "@/components/icons/icon-defaults";
import { averageCardsPerSet, statText } from "@/pages/k/components/flashcard-list/flashcard-list-logic";
import { cn } from "@/lib/utils";

interface FlashcardStatsData {
  totalGroups: number;
  totalCards: number;
  totalViews: number;
}

interface FlashcardStatsSectionProps {
  /** null while unknown: every tile shows a dash. */
  stats: FlashcardStatsData | null;
}

function StatTile({ icon: StatIcon, label, value, tone }: { icon: Icon; label: string; value: string; tone: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas p-3.5 shadow-soft">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-lg [&_svg]:size-5", tone)}>
        <DecorativeIcons>
          <StatIcon />
        </DecorativeIcons>
      </span>
      <div className="min-w-0">
        <p className="text-[13px] leading-tight text-body">{label}</p>
        <p className="text-2xl font-bold leading-tight tabular-nums text-ink">{value}</p>
      </div>
    </div>
  );
}

const FlashcardStatsSectionComponent = ({ stats }: FlashcardStatsSectionProps) => (
  <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
    <StatTile icon={FoldersIcon} label="Tổng số bộ thẻ" value={statText(stats?.totalGroups ?? null)} tone="bg-brand-soft-hover text-brand-strong" />
    <StatTile icon={CardsIcon} label="Tổng số thẻ" value={statText(stats?.totalCards ?? null)} tone="bg-emerald-50 text-emerald-600" />
    <StatTile icon={EyeIcon} label="Tổng lượt xem" value={statText(stats?.totalViews ?? null)} tone="bg-violet-50 text-violet-600" />
    <StatTile
      icon={ChartBarIcon}
      label="Thẻ trung bình / bộ"
      value={statText(stats ? averageCardsPerSet(stats.totalCards, stats.totalGroups) : null)}
      tone="bg-amber-50 text-amber-500"
    />
  </div>
);

FlashcardStatsSectionComponent.displayName = "FlashcardStatsSection";

export const FlashcardStatsSection = memo(FlashcardStatsSectionComponent);

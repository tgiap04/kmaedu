import type { ReactNode } from "react";
import { ClockIcon, EyeIcon, StackIcon, StarIcon } from "@phosphor-icons/react";
import { formatStudyTime } from "@/lib/flashcard-detail/flashcard-detail";
import { cn } from "@/lib/utils";

type Tone = "red" | "green" | "violet" | "amber";

const TONES: Record<Tone, { circle: string; wave: string }> = {
  red: { circle: "bg-brand-soft text-brand", wave: "text-brand" },
  green: { circle: "bg-emerald-50 text-emerald-600", wave: "text-emerald-500" },
  violet: { circle: "bg-violet-50 text-violet-600", wave: "text-violet-500" },
  amber: { circle: "bg-amber-50 text-amber-500", wave: "text-amber-400" },
};

/** Overview tile: tinted round icon, label (may wrap) over a large value, soft wave in the corner. */
function Tile({ icon, tone, title, value, hint }: { icon: ReactNode; tone: Tone; title: string; value: string | number; hint?: string }) {
  const colors = TONES[tone];
  return (
    <div className="relative overflow-hidden rounded-lg border border-hairline-soft bg-canvas p-4 shadow-raised">
      <svg viewBox="0 0 200 80" preserveAspectRatio="none" className={cn("pointer-events-none absolute bottom-0 right-0 h-12 w-3/4 opacity-[0.12]", colors.wave)} aria-hidden>
        <path d="M0 80 C 40 70, 70 40, 110 45 S 170 20, 200 5 L 200 80 Z" fill="currentColor" />
      </svg>
      <div className="relative flex items-center gap-3">
        <span className={cn("grid size-11 shrink-0 place-items-center rounded-full [&_svg]:size-[22px]", colors.circle)}>{icon}</span>
        <div className="min-w-0">
          <p className="text-[14px] font-medium leading-tight text-body">{title}</p>
          <p className="mt-1 text-2xl font-bold leading-none text-ink">{value}</p>
          {hint && <p className="mt-1 text-[12px] text-body">{hint}</p>}
        </div>
      </div>
    </div>
  );
}

interface Props {
  /** null while the cards are loading or could not be read: shown as "—", never as 0. */
  cardCount: number | null;
  viewCount: number;
  /** Whole percent of the cards the viewer studied; null = no progress yet or not readable. */
  completion: number | null;
}

/** The four overview tiles of a flashcard set: cards, estimated study time, views, completion rate. */
export function FlashcardDetailStats({ cardCount, viewCount, completion }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <Tile icon={<StackIcon weight="duotone" aria-hidden />} tone="red" title="Tổng số thẻ" value={cardCount ?? "—"} />
      <Tile icon={<ClockIcon weight="duotone" aria-hidden />} tone="green" title="Thời gian học ước tính" value={cardCount === null ? "—" : formatStudyTime(cardCount)} />
      <Tile icon={<EyeIcon weight="duotone" aria-hidden />} tone="violet" title="Lượt xem" value={viewCount} />
      <Tile icon={<StarIcon weight="duotone" aria-hidden />} tone="amber" title="Tỷ lệ hoàn thành" value={completion === null ? "—" : `${completion}%`} hint={completion === null ? "Bạn chưa học bộ thẻ này" : undefined} />
    </div>
  );
}

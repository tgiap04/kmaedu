import { useMemo } from "react";
import { Link } from "react-router-dom";
import { PlayCircleIcon } from "@phosphor-icons/react";
import { studiedCount } from "@/lib/flashcard-detail/flashcard-detail";
import type { Flashcard, FlashcardSet } from "@/types/flashcardSet";

const day = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");

interface Props {
  set: FlashcardSet;
  cards: Flashcard[];
  /** Ids of the cards the viewer studied; null = no progress yet or not readable. */
  studiedIds: string[] | null;
}

/** "Thống kê học tập": the viewer's progress on the set, how the cards split over labels, and the set's dates. */
export function FlashcardStatsPanel({ set, cards, studiedIds }: Props) {
  const studied = studiedIds ? studiedCount(studiedIds, cards.map((c) => c.id)) : null;
  const percent = studied === null || cards.length === 0 ? 0 : Math.round((studied / cards.length) * 100);
  const groups = useMemo(() => {
    const byLabel = new Map<string, { name: string; color: string | null; count: number }>();
    let none = 0;
    for (const c of cards) {
      if (!c.label) none++;
      else byLabel.set(c.label.id, { name: c.label.name, color: c.label.color, count: (byLabel.get(c.label.id)?.count ?? 0) + 1 });
    }
    return [...byLabel.values(), ...(none > 0 ? [{ name: "Chưa gán nhãn", color: null, count: none }] : [])];
  }, [cards]);

  const facts = [
    { text: "Đã học", value: studied === null ? "—" : `${studied}/${cards.length} thẻ` },
    { text: "Chưa học", value: studied === null ? "—" : `${cards.length - studied} thẻ` },
    { text: "Lượt xem", value: String(set.viewCount ?? 0) },
    { text: "Ngày tạo", value: day(set.createdAt) },
    { text: "Cập nhật lần cuối", value: day(set.updatedAt) },
  ];

  return (
    <div className="grid gap-5 pb-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="rounded-lg border border-hairline-soft p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[15px] font-semibold text-ink">Tiến độ học của bạn</p>
            <Link to={`/study-flashcard/${set.id}`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-strong">
              <PlayCircleIcon className="size-4" aria-hidden />
              Học ngay
            </Link>
          </div>
          <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-surface-soft" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Tỷ lệ hoàn thành">
            <div className="h-full rounded-full bg-brand transition-[width]" style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-[13px] text-body">
            {studied === null || studied === 0 ? "Bạn chưa học bộ thẻ này. Bấm \"Học ngay\" để bắt đầu." : `${percent}% bộ thẻ đã được học.`}
          </p>
        </div>
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {facts.map((f) => (
            <div key={f.text} className="rounded-lg border border-hairline-soft px-3.5 py-3">
              <dt className="text-[13px] text-muted-foreground">{f.text}</dt>
              <dd className="mt-0.5 text-[16px] font-bold tabular-nums text-ink">{f.value}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="rounded-lg border border-hairline-soft p-4">
        <p className="text-[15px] font-semibold text-ink">Thẻ theo nhãn</p>
        {groups.length === 0 ? (
          <p className="mt-3 text-[14px] text-body">Bộ thẻ chưa có thẻ nào.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {groups.map((g) => (
              <li key={g.name}>
                <div className="flex items-center justify-between gap-3 text-[14px]">
                  <span className="flex min-w-0 items-center gap-2 text-ink">
                    <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: g.color ?? "var(--muted-soft)" }} />
                    <span className="truncate">{g.name}</span>
                  </span>
                  <span className="shrink-0 tabular-nums text-body">{g.count} thẻ</span>
                </div>
                <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-soft">
                  <div className="h-full rounded-full" style={{ width: `${Math.round((g.count / cards.length) * 100)}%`, backgroundColor: g.color ?? "var(--muted-soft)" }} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

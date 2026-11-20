interface Props {
  index: number;
  total: number;
  studied: number;
  percent: number;
}

/** Where you are in the set, how much is remembered, and a bar for the position. */
export function StudyProgressRow({ index, total, studied, percent }: Props) {
  const position = total ? ((index + 1) / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full bg-brand-soft px-4 py-1.5 text-sm font-bold tabular-nums text-brand-strong">{index + 1} / {total}</span>
        <span className="flex items-center gap-2 rounded-full border border-hairline bg-canvas px-4 py-1.5 text-sm font-semibold tabular-nums text-ink shadow-soft">
          <span className="size-2 rounded-full bg-emerald-500" aria-hidden />
          {studied} đã học · {percent}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label={`Thẻ ${index + 1} trên ${total}`}
        aria-valuenow={index + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        className="mt-5 h-2 overflow-hidden rounded-full bg-hairline-soft"
      >
        <div className="h-full min-w-5 rounded-full bg-gradient-to-r from-brand/80 to-brand transition-[width] duration-500" style={{ width: `${position}%` }} />
      </div>
    </div>
  );
}

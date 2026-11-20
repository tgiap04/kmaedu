import { cn } from "@/lib/utils";

interface Props {
  /** Per question, in order: answered or not. */
  answered: boolean[];
  current: number;
  /** Review: per question, right (true), wrong (false) or unanswered (null); each segment then shows its own result. */
  results?: (boolean | null)[];
  /** Go to the question at this index. */
  onJump: (index: number) => void;
}

/** Above this many questions the segments get too thin; one continuous bar shows the share instead. */
const MAX_SEGMENTS = 40;

/** Which question a click at `x` pixels into a bar `width` pixels wide lands on. */
export function indexAtPosition(x: number, width: number, count: number): number {
  if (count <= 0 || width <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor((x / width) * count)));
}

/**
 * One segment per question, filled when that question is answered; the current question is
 * tinted when not yet answered. In review (`results`) each segment is green, red or grey for its own question.
 * Clicking segment N goes to question N.
 */
export function QuizProgressSegments({ answered, current, results, onJump }: Props) {
  const total = answered.length;
  const done = answered.filter(Boolean).length;
  const label = `Đã trả lời ${done}/${total} câu`;

  if (total > MAX_SEGMENTS) {
    const pct = total ? (done / total) * 100 : 0;
    // Too many questions for a button each: the click position picks the question; the grid stays the keyboard path.
    return (
      <div
        role="progressbar"
        aria-label={label}
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        title="Bấm để đến câu tương ứng"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          onJump(indexAtPosition(e.clientX - rect.left, rect.width, total));
        }}
        className="group cursor-pointer py-2"
      >
        <div className="h-1.5 overflow-hidden rounded-full bg-hairline transition-transform group-hover:scale-y-[1.4]">
          <div className="h-full rounded-full bg-brand transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  // What a screen reader hears after "Đến câu N": the result in review, else whether it is answered.
  const segmentState = (i: number) => {
    if (results) return results[i] === true ? ", đúng" : results[i] === false ? ", sai" : "";
    return answered[i] ? ", đã trả lời" : "";
  };

  const segmentColor = (i: number) => {
    if (results) {
      const r = results[i];
      return r === true ? "bg-emerald-500" : r === false ? "bg-brand" : "bg-hairline group-hover:bg-brand/30";
    }
    return answered[i] ? "bg-brand group-hover:bg-brand-strong" : i === current ? "bg-brand/30" : "bg-hairline group-hover:bg-brand/30";
  };

  return (
    <nav aria-label={label} className="flex gap-1.5 sm:gap-2">
      {answered.map((_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onJump(i)}
          aria-label={`Đến câu ${i + 1}${segmentState(i)}`}
          aria-current={i === current ? "step" : undefined}
          title={`Câu ${i + 1}`}
          className="group flex-1 cursor-pointer py-2 focus-visible:outline-none"
        >
          <span
            className={cn(
              "block h-1.5 rounded-full transition-[background-color,transform] duration-200 group-hover:scale-y-[1.6] group-focus-visible:ring-2 group-focus-visible:ring-brand/40",
              segmentColor(i),
            )}
          />
        </button>
      ))}
    </nav>
  );
}

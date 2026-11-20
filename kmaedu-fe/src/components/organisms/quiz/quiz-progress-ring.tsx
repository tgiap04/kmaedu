import { cn } from "@/lib/utils";

interface Props {
  /** 0–100. */
  percent: number;
  /** Outer size in px. */
  size?: number;
  stroke?: number;
  labelClassName?: string;
}

/** Brand ring filled clockwise to `percent`, the number in the middle. */
export function QuizProgressRing({ percent, size = 76, stroke = 7, labelClassName }: Props) {
  const value = Math.min(100, Math.max(0, percent));
  const r = (size - stroke) / 2 - 1;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="size-full -rotate-90" aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-canvas" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - value / 100)}
          className="stroke-brand transition-[stroke-dashoffset] duration-700"
        />
      </svg>
      <span className={cn("absolute inset-0 grid place-items-center text-base font-bold tabular-nums text-brand", labelClassName)}>{Math.round(value)}%</span>
    </div>
  );
}

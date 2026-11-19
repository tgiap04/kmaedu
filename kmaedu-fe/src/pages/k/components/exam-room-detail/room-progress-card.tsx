import { useId } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { RoomOverview, RoomOverviewWindow } from "@/apis/examAttemptApi";
import { completionPercent, timelinePoints } from "@/lib/exam-room/room-progress";
import { ToolbarSelect } from "@/pages/k/components/flashcard-list/toolbar-select";
import { DetailPanel } from "./room-detail-cards";

/** A useId() value usable inside `url(#…)`: React's ids carry characters an SVG reference does not accept. */
const svgId = (id: string) => `g${id.replace(/[^\w-]/g, "")}`;

const RANGES: { value: RoomOverviewWindow; label: string }[] = [
  { value: "30m", label: "30 phút qua" },
  { value: "1h", label: "1 giờ qua" },
  { value: "24h", label: "24 giờ qua" },
  { value: "7d", label: "7 ngày qua" },
];

interface Props {
  data: RoomOverview | null;
  failed: boolean;
  range: RoomOverviewWindow;
  onRangeChange: (range: RoomOverviewWindow) => void;
  onRetry: () => void;
}

/** Teal ring filled to `percent`, the figure in its middle. */
function Ring({ percent }: { percent: number }) {
  const gradient = svgId(useId());
  const r = 58;
  const length = 2 * Math.PI * r;
  return (
    <div className="relative size-[148px] shrink-0" role="img" aria-label={`Đã nộp ${percent}%`}>
      <svg viewBox="0 0 148 148" className="size-full -rotate-90">
        <defs>
          <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#14b8a6" />
          </linearGradient>
        </defs>
        <circle cx="74" cy="74" r={r} fill="none" stroke="var(--surface-soft, #f1f5f9)" strokeWidth="13" />
        <circle
          cx="74"
          cy="74"
          r={r}
          fill="none"
          stroke={`url(#${gradient})`}
          strokeWidth="13"
          strokeLinecap="round"
          strokeDasharray={`${(length * percent) / 100} ${length}`}
          className="transition-[stroke-dasharray] duration-500"
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[30px] font-bold tabular-nums text-ink">{percent}%</span>
    </div>
  );
}

function Legend({ data }: { data: RoomOverview }) {
  const rows = [
    { label: "Đã hoàn thành", value: data.completed, dot: "bg-emerald-500" },
    { label: "Đang làm", value: data.inProgress, dot: "bg-blue-500" },
    { label: "Chưa bắt đầu", value: data.notStarted, dot: "bg-muted-foreground/40" },
  ];
  return (
    <dl className="min-w-44 flex-1 space-y-4">
      {rows.map((row) => (
        <div key={row.label} className="flex items-center gap-2.5 text-[15px]">
          <span className={`size-2.5 shrink-0 rounded-full ${row.dot}`} aria-hidden />
          <dt className="flex-1 text-body">{row.label}</dt>
          <dd className="font-semibold tabular-nums text-ink">{row.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function SubmissionsChart({ data }: { data: RoomOverview }) {
  const fill = svgId(useId());
  const points = timelinePoints(data.timeline);
  return (
    <div className="h-[150px] min-w-0 flex-[1.3] basis-56" aria-label="Số bài nộp theo thời gian">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={points} margin={{ top: 8, right: 4, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id={fill} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ee2f2b" stopOpacity={0.22} />
              <stop offset="100%" stopColor="#ee2f2b" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#eef0f3" />
          <XAxis dataKey="label" hide />
          <YAxis hide allowDecimals={false} domain={[0, (max: number) => Math.max(1, max)]} />
          <Tooltip
            contentStyle={{ backgroundColor: "var(--canvas)", border: "1px solid var(--hairline)", borderRadius: 8, fontSize: 12, color: "var(--ink)" }}
            formatter={(value) => [`${Number(value ?? 0)} bài`, "Đã nộp"]}
          />
          {/* No draw-in animation: a live room re-reads its numbers every 30 s, and the clipped draw-in left the
              area unpainted in headless Chrome. */}
          <Area type="monotone" dataKey="count" stroke="#ee2f2b" strokeWidth={2} fill={`url(#${fill})`} dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function RoomProgressCard({ data, failed, range, onRangeChange, onRetry }: Props) {
  // Just after the range changed, the numbers shown are still the previous range's: dim them until the new ones land.
  const stale = data !== null && data.timeline.window !== range;
  return (
    <DetailPanel
      title="Tiến độ làm bài"
      action={<ToolbarSelect icon={null} label="Khoảng thời gian" options={RANGES} value={range} onChange={(v) => onRangeChange(v as RoomOverviewWindow)} />}
    >
      {!data ? (
        failed ? (
          <div className="flex flex-col items-center gap-2 py-10 text-center text-sm text-muted-foreground">
            Không tải được tiến độ làm bài.
            <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">Thử lại</button>
          </div>
        ) : (
          <div className="h-[160px] animate-pulse rounded-lg bg-surface-soft" aria-busy="true" />
        )
      ) : (
        <div className={`flex flex-wrap items-center gap-x-8 gap-y-5 pt-1 transition-opacity ${stale ? "opacity-60" : ""}`} aria-busy={stale}>
          <Ring percent={completionPercent(data)} />
          <Legend data={data} />
          <div className="hidden h-[150px] w-px bg-hairline-soft md:block" aria-hidden />
          <SubmissionsChart data={data} />
        </div>
      )}
      {data && failed && <p className="mt-2 text-xs text-muted-foreground">Không cập nhật được số mới nhất. <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">Thử lại</button></p>}
    </DetailPanel>
  );
}

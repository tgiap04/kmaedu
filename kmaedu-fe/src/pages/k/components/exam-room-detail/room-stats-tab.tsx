import { Link } from "react-router-dom";
import { ChartBarIcon, CheckCircleIcon, TrophyIcon } from "@phosphor-icons/react";
import type { RoomOverview } from "@/apis/examAttemptApi";
import { StatHighlightCard } from "@/components/k-page/stat-highlight-card";
import { formatSpan, roomTimeline, sessionPhase } from "@/lib/exam-room/room-status";
import type { ExamSessionBasic } from "@/types/examRoom";
import { RoomStatusPill } from "../exam-room-list/room-status-pill";
import { ScoreDistributionCard } from "../session-analytics-sections";

interface Props {
  roomId: string;
  overview: RoomOverview | null;
  sessions: ExamSessionBasic[];
  now: number;
}

/** Room-wide results: submitted / average / pass rate, the score spread, and a link to each session's own report. */
export function RoomStatsTab({ roomId, overview, sessions, now }: Props) {
  if (!overview) return <div className="h-48 animate-pulse rounded-lg bg-surface-soft" aria-busy="true" />;
  const passRate = overview.completed ? Math.round((overview.passed / overview.completed) * 100) : null;
  const buckets = overview.scoreBuckets.map((count, i) => ({ range: `${i + 1}`, label: `${i * 10}-${(i + 1) * 10}%`, count }));
  const ordered = [...sessions].sort((a, b) => Date.parse(b.startTime) - Date.parse(a.startTime));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatHighlightCard icon={CheckCircleIcon} label="Đã nộp bài" value={`${overview.completed}/${overview.candidates}`} tone="green" />
        <StatHighlightCard icon={ChartBarIcon} label="Điểm trung bình" value={overview.averageScore === null ? "–" : `${overview.averageScore}%`} tone="blue" />
        <StatHighlightCard icon={TrophyIcon} label="Tỉ lệ đạt" value={passRate === null ? "–" : `${passRate}%`} tone="amber" />
      </div>

      <ScoreDistributionCard data={buckets} />

      <section className="overflow-hidden rounded-lg border border-hairline">
        <h3 className="border-b border-hairline-soft bg-surface-soft/70 px-4 py-3 text-sm font-semibold text-ink">Kết quả theo phiên thi</h3>
        {ordered.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Phòng chưa có phiên thi nào.</p>
        ) : (
          <ul className="divide-y divide-hairline-soft">
            {ordered.map((s) => (
              <li key={s.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <RoomStatusPill status={sessionPhase(s, now)} />
                <span className="flex-1 text-sm tabular-nums text-ink">{formatSpan(roomTimeline([s], now))}</span>
                <Link to={`/k/manage-exam-room/${roomId}/session/${s.id}`} className="text-sm font-semibold text-brand hover:underline">
                  Xem thống kê
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

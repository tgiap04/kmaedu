import { WarningIcon, ChartBarIcon, CaretCircleDownIcon, CaretCircleUpIcon, ClockIcon, TrophyIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { ExamAttemptListItem } from "@/apis/examAttemptApi";
import { Badge } from "@/components/antd/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/antd/table";
import { SectionCard, SectionMessage, pillClass } from "@/components/k-page/section-card";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";
import { displayUserName } from "@/lib/user/display-user-name";

const CHART_COLORS = ["#3b82f6", "#22c55e", "#eab308", "#f97316", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#64748b", "#84cc16"];
const VIOLATION_COLORS: Record<string, string> = {
  TAB_SWITCH: "#ef4444",
  WINDOW_BLUR: "#f97316",
  DEVTOOLS_OPEN: "#dc2626",
  COPY_PASTE: "#ea580c",
  RIGHT_CLICK: "#f59e0b",
  FULLSCREEN_EXIT: "#d97706",
  PRINT_SCREEN: "#b91c1c",
};

export function formatDuration(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function AnalyticsStats({ completed, avgScore, passed, violations }: { completed: number; avgScore: number; passed: number; violations: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HistoryStatCard icon={UsersThreeIcon} title="Thí sinh hoàn thành" value={completed} tone="red" />
      <HistoryStatCard icon={ChartBarIcon} title="Điểm trung bình" value={`${avgScore.toFixed(1)}%`} tone="green" />
      <HistoryStatCard icon={TrophyIcon} title="Đạt yêu cầu" value={`${passed}/${completed}`} tone="amber" />
      <HistoryStatCard icon={WarningIcon} title="Lượt vi phạm" value={violations} tone="blue" />
    </div>
  );
}

export function ScoreDistributionCard({ data }: { data: Array<{ range: string; label: string; count: number }> }) {
  return (
    <SectionCard icon={<ChartBarIcon />} title="Phân bố điểm số" plain>
      <div className="h-52 p-4 md:p-5">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="range" fontSize={12} />
            <YAxis fontSize={12} allowDecimals={false} />
            <Tooltip formatter={(value) => [`${Number(value ?? 0)} thí sinh`, "Số lượng"]} labelFormatter={(label) => `Điểm ${Number(label) * 10 - 10}-${Number(label) * 10}%`} />
            <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

export function ViolationsCard({ data }: { data: Array<{ name: string; value: number; type: string }> }) {
  return (
    <SectionCard icon={<WarningIcon />} title="Thống kê vi phạm" plain>
      <div className="h-64 p-4 md:p-5">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${(name || "").substring(0, 10)}... ${(((percent || 0) * 100)).toFixed(0)}%`} outerRadius={80} fill="#8884d8" dataKey="value">
              {data.map((entry, index) => <Cell key={entry.type + index} fill={VIOLATION_COLORS[entry.type] || CHART_COLORS[index % CHART_COLORS.length]} />)}
            </Pie>
            <Tooltip formatter={(value, name) => [`${Number(value ?? 0)} lần`, String(name ?? "")]} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </SectionCard>
  );
}

type SortField = "score" | "violations";

interface RankingProps {
  attempts: ExamAttemptListItem[];
  passingScore: number;
  sortField: SortField;
  sortOrder: "asc" | "desc";
  onSort: (field: SortField) => void;
  onViewDetail: (userId: string) => void;
}

function SortLabel({ label, active, order }: { label: string; active: boolean; order: "asc" | "desc" }) {
  return (
    <div className="flex items-center gap-1">
      {label}
      {active && (order === "desc" ? <CaretCircleDownIcon className="h-4 w-4" /> : <CaretCircleUpIcon className="h-4 w-4" />)}
    </div>
  );
}

export function RankingCard({ attempts, passingScore, sortField, sortOrder, onSort, onViewDetail }: RankingProps) {
  return (
    <SectionCard icon={<TrophyIcon />} title="Bảng xếp hạng thí sinh" countLabel={`${attempts.length} thí sinh`} plain>
      {attempts.length === 0 ? (
        <SectionMessage title="Chưa có thí sinh nào hoàn thành bài thi" />
      ) : (
        <div className="overflow-x-auto border-t border-hairline-soft">
          <Table>
            <TableHeader>
              <TableRow className="border-hairline-soft bg-surface-soft/70 hover:bg-transparent">
                <TableHead className="w-16">Hạng</TableHead>
                <TableHead>Thí sinh</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => onSort("score")}><SortLabel label="Điểm cao nhất" active={sortField === "score"} order={sortOrder} /></TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>Thời gian làm</TableHead>
                <TableHead className="cursor-pointer select-none" onClick={() => onSort("violations")}><SortLabel label="Vi phạm" active={sortField === "violations"} order={sortOrder} /></TableHead>
                <TableHead className="text-right">Chi tiết</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attempts.map((attempt, index) => {
                const passed = attempt.score >= passingScore;
                const rank = index + 1;
                return (
                  <TableRow key={attempt.userId} className="border-hairline-soft transition-colors hover:bg-surface-soft">
                    <TableCell><span className={`font-bold ${rank === 1 ? "text-yellow-500" : rank === 2 ? "text-gray-400" : rank === 3 ? "text-yellow-600" : ""}`}>#{rank}</span></TableCell>
                    <TableCell><p className="whitespace-nowrap font-medium text-ink">{displayUserName(attempt.user)}</p></TableCell>
                    <TableCell className="whitespace-nowrap"><span className="font-bold">{attempt.score.toFixed(1)}%</span><span className="ml-1 text-xs text-muted-foreground">({attempt.correctAnswers}/{attempt.totalQuestions})</span></TableCell>
                    <TableCell>{passed ? <Badge variant="default" className="bg-green-500">Đạt</Badge> : <Badge variant="destructive">Chưa đạt</Badge>}</TableCell>
                    <TableCell><div className="flex items-center gap-1"><ClockIcon className="h-3 w-3" />{formatDuration(attempt.timeSpentSeconds)}</div></TableCell>
                    <TableCell>{(attempt.violationCount || 0) > 0 ? <Badge variant="outline" className="border-red-500 text-red-500">{attempt.violationCount}</Badge> : <span className="text-muted-foreground">0</span>}</TableCell>
                    <TableCell className="text-right"><button type="button" className={pillClass} onClick={() => onViewDetail(attempt.userId)}>Xem</button></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </SectionCard>
  );
}

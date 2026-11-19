import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ChartBarIcon } from "@phosphor-icons/react";
import { getExamAttemptsBySessionApi, type ExamAttemptListItem } from "@/apis/examAttemptApi";
import { getSessionCheatingStatsApi, type CheatingSessionStats } from "@/apis/cheatingLogApi";
import { getExamSessionByIdApi } from "@/apis/examSessionApi";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/antd/breadcrumb";
import { PageHeader } from "@/components/k-page/page-header";
import { Skeleton } from "@/components/antd/skeleton";
import { toast } from "@/components/antd/toast";
import { AttemptDetailSheet } from "./components/attempt-detail-sheet";
import { useAttemptDetail } from "./components/use-attempt-detail";
import { AnalyticsStats, RankingCard, ScoreDistributionCard, ViolationsCard } from "./components/session-analytics-sections";

const ATTEMPT_STATUS = {
  IN_PROGRESS: 0,
  COMPLETED: 1,
  CANCELLED: 2,
};

export default function ExamRoomSessionAnalyticsPage() {
  const { id: examRoomId = "", sessionId = "" } = useParams();
  const [loading, setLoading] = useState(true);
  const [sessionInfo, setSessionInfo] = useState<{ title: string; passingScore: number; startTime: string; endTime?: string } | null>(null);
  const [attempts, setAttempts] = useState<ExamAttemptListItem[]>([]);
  const [cheatingStats, setCheatingStats] = useState<CheatingSessionStats[]>([]);
  const [sortField, setSortField] = useState<"score" | "violations">("score");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [sessionData, attemptsData, statsData] = await Promise.all([
          getExamSessionByIdApi(sessionId),
          getExamAttemptsBySessionApi(sessionId, 1, 100, true),
          getSessionCheatingStatsApi(sessionId),
        ]);

        setSessionInfo({
          title: sessionData.examRoom?.title || "Phiên thi",
          passingScore: (sessionData as any).passingScore || 0,
          startTime: sessionData.startTime,
          endTime: sessionData.endTime || undefined,
        });
        setAttempts(attemptsData.attempts);
        setCheatingStats(statsData);
      } catch (error: any) {
        console.error("Failed to load session data:", error);
        toast.error(error?.response?.data?.message || "Không thể tải dữ liệu");
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) {
      fetchData();
    }
  }, [sessionId]);

  const { show: showAttempt, sheet: attemptSheet } = useAttemptDetail();
  const handleViewDetail = useCallback((userId: string) => showAttempt(sessionId, userId), [showAttempt, sessionId]);

  const sortedAttempts = useMemo(() => {
    const completed = attempts.filter((a) => a.status === ATTEMPT_STATUS.COMPLETED);
    return [...completed].sort((a, b) => {
      const aVal = sortField === "score" ? a.score : a.violationCount || 0;
      const bVal = sortField === "score" ? b.score : b.violationCount || 0;
      return sortOrder === "desc" ? bVal - aVal : aVal - bVal;
    });
  }, [attempts, sortField, sortOrder]);

  const avgScore = sortedAttempts.length > 0 ? sortedAttempts.reduce((sum, a) => sum + a.score, 0) / sortedAttempts.length : 0;
  const passedCount = sortedAttempts.filter((a) => a.score >= (sessionInfo?.passingScore || 0)).length;
  const totalViolations = cheatingStats.reduce((sum, s) => sum + s.totalCount, 0);

  const scoreDistribution = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ range: `${i + 1}`, label: `${i * 10}-${(i + 1) * 10}%`, count: 0 }));
    sortedAttempts.forEach((a) => {
      const binIndex = Math.min(Math.floor(a.score / 10), 9);
      bins[binIndex].count++;
    });
    return bins;
  }, [sortedAttempts]);

  const violationPieData = useMemo(() => cheatingStats.map((stat) => ({ name: stat.description, value: stat.totalCount, type: stat.type })), [cheatingStats]);

  const handleSort = (field: "score" | "violations") => {
    if (sortField === field) setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortOrder("desc");
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-72 rounded-lg" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={<ChartBarIcon />}
        title="Thống kê phiên thi"
        subtitle={sessionInfo?.title}
        eyebrow={
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/k/manage-exam-room">Quản lý Phòng thi</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbLink asChild><Link to={`/k/manage-exam-room/${examRoomId}`}>{sessionInfo?.title || "Phòng thi"}</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Thống kê phiên thi</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        }
      />
      <div className="space-y-4">
        <AnalyticsStats completed={sortedAttempts.length} avgScore={avgScore} passed={passedCount} violations={totalViolations} />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <ScoreDistributionCard data={scoreDistribution} />
          {cheatingStats.length > 0 && <ViolationsCard data={violationPieData} />}
        </div>

        <RankingCard
          attempts={sortedAttempts}
          passingScore={sessionInfo?.passingScore || 0}
          sortField={sortField}
          sortOrder={sortOrder}
          onSort={handleSort}
          onViewDetail={handleViewDetail}
        />
      </div>

      <AttemptDetailSheet {...attemptSheet} passingScore={sessionInfo?.passingScore || 0} />
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { getExamAttemptDetailApi, type ExamAttemptDetail } from "@/apis/examAttemptApi";
import { getUserAttemptsWithLogsApi, type UserAttemptWithLogs } from "@/apis/cheatingLogApi";
import { toast } from "@/components/antd/toast";

/**
 * The attempt sheet's data for one candidate of a session: every attempt with its violation logs,
 * and the detail of `attemptId` when given (the attempt a row shows), else of the best one.
 * A second click before the first answer arrives wins.
 */
export function useAttemptDetail() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState<ExamAttemptDetail | null>(null);
  const [userAttempts, setUserAttempts] = useState<UserAttemptWithLogs[]>([]);
  const [logs, setLogs] = useState<Array<{ type: string; description: string; totalCount: number }>>([]);
  const latest = useRef(0);

  const show = useCallback(async (sessionId: string, userId: string, attemptId?: string) => {
    const token = ++latest.current;
    setOpen(true);
    setLoading(true);
    setAttempt(null);
    try {
      const data = await getUserAttemptsWithLogsApi(sessionId, userId);
      if (token !== latest.current) return;
      setUserAttempts(data.attempts);
      setLogs(data.aggregatedLogs);
      if (data.attempts.length === 0 && !attemptId) return;
      const target = attemptId ?? data.attempts.reduce((top, current) => (current.score > top.score ? current : top)).id;
      const detail = await getExamAttemptDetailApi(target);
      if (token === latest.current) setAttempt(detail);
    } catch (error) {
      console.error("Failed to load attempt detail:", error);
      if (token === latest.current) toast.error("Không thể tải chi tiết");
    } finally {
      if (token === latest.current) setLoading(false);
    }
  }, []);

  return {
    show,
    sheet: { open, onOpenChange: setOpen, loadingDetail: loading, selectedAttempt: attempt, selectedUserAttempts: userAttempts, selectedLogs: logs },
  };
}

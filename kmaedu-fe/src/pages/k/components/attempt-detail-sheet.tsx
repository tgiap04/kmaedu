import { format } from "date-fns";
import { WarningIcon, ChartBarIcon, CheckCircleIcon, TrophyIcon } from "@phosphor-icons/react";
import { CHEATING_TYPE, CHEATING_TYPE_LABELS, type UserAttemptWithLogs } from "@/apis/cheatingLogApi";
import type { ExamAttemptDetail } from "@/apis/examAttemptApi";
import { Badge } from "@/components/antd/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/antd/sheet";
import { Skeleton } from "@/components/antd/skeleton";
import { displayUserInitial, displayUserName } from "@/lib/user/display-user-name";
import { formatDuration } from "./session-analytics-sections";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  loadingDetail: boolean;
  selectedAttempt: ExamAttemptDetail | null;
  selectedUserAttempts: UserAttemptWithLogs[];
  selectedLogs: Array<{ type: string; description: string; totalCount: number }>;
  passingScore: number;
}

export function AttemptDetailSheet({ open, onOpenChange, loadingDetail, selectedAttempt, selectedUserAttempts, selectedLogs, passingScore }: Props) {
  return (
  <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent className="sm:max-w-lg overflow-y-auto">
      <SheetHeader><SheetTitle>Chi tiết bài làm</SheetTitle><SheetDescription>Xem thông tin chi tiết và các vi phạm</SheetDescription></SheetHeader>
      {loadingDetail ? (
        <div className="space-y-4 mt-6"><Skeleton className="h-20 w-full" /><Skeleton className="h-40 w-full" /></div>
      ) : selectedAttempt ? (
        <div className="space-y-6 mt-6">
          <div className="rounded-lg border border-hairline bg-surface-soft p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-brand-soft text-brand flex items-center justify-center"><span className="text-lg font-bold">{displayUserInitial(selectedAttempt.user)}</span></div>
              <div><p className="font-semibold">{displayUserName(selectedAttempt.user)}</p></div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2"><TrophyIcon className="h-4 w-4 text-yellow-500" />Điểm cao nhất</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg border border-hairline p-4 text-center"><p className="text-3xl font-bold text-brand">{selectedAttempt.score.toFixed(1)}%</p><p className="text-sm text-muted-foreground">Điểm số</p></div>
              <div className="rounded-lg border border-hairline p-4 text-center"><p className="text-3xl font-bold">{formatDuration(selectedAttempt.timeSpentSeconds)}</p><p className="text-sm text-muted-foreground">Thời gian</p></div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold flex items-center gap-2"><ChartBarIcon className="h-4 w-4 text-brand" />Lịch sử làm bài ({selectedUserAttempts.length} lần)</h4>
            <div className="space-y-2">
              {selectedUserAttempts.sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()).map((attempt, index) => {
                const passed = attempt.score >= (passingScore);
                return (
                  <div key={attempt.id} className={`rounded-lg border border-hairline p-3 ${attempt.id === selectedAttempt.id ? "border-brand-border bg-brand-soft" : ""}`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2"><span className="font-medium">Lần {selectedUserAttempts.length - index}</span>{attempt.id === selectedAttempt.id && <Badge variant="default" className="bg-yellow-500 text-xs">Cao nhất</Badge>}</div>
                      <Badge variant={passed ? "default" : "destructive"} className={passed ? "bg-green-500" : ""}>{passed ? "Đạt" : "Chưa đạt"}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div><span className="text-muted-foreground">Điểm:</span> <span className="font-bold">{attempt.score.toFixed(1)}%</span></div>
                      <div><span className="text-muted-foreground">Thời gian:</span> {formatDuration(attempt.timeSpentSeconds)}</div>
                      <div><span className="text-muted-foreground">Đúng:</span> {attempt.correctAnswers}/{attempt.totalQuestions}</div>
                      <div><span className="text-muted-foreground">Vi phạm:</span> <span className={(attempt.violationCount || 0) > 0 ? "text-red-500 font-semibold" : ""}>{attempt.violationCount || 0}</span></div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-2">{format(new Date(attempt.startedAt), "HH:mm:ss dd/MM/yyyy")}</p>
                  </div>
                );
              })}
            </div>
          </div>

          {selectedLogs.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2"><WarningIcon className="h-4 w-4 text-red-500" />Chi tiết vi phạm tổng hợp ({selectedLogs.reduce((sum, log) => sum + log.totalCount, 0)} lần)</h4>
              <p className="text-sm text-muted-foreground">Tổng hợp vi phạm từ tất cả {selectedUserAttempts.length} lần thi</p>
              <div className="space-y-2">
                {selectedLogs.map((log) => (
                  <div key={log.type} className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">{CHEATING_TYPE_LABELS[log.type as CHEATING_TYPE] || log.type}</p>
                        <p className="text-xs text-muted-foreground">{log.description}</p>
                      </div>
                      <Badge variant="destructive">{log.totalCount}x</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-hairline p-4 text-center text-muted-foreground"><CheckCircleIcon className="h-8 w-8 mx-auto mb-2 text-green-500" /><p>Không có vi phạm</p></div>
          )}
        </div>
      ) : null}
    </SheetContent>
  </Sheet>
  );
}

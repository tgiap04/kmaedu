import { format } from "date-fns";
import { ChartBarIcon, CalendarBlankIcon, CheckCircleIcon, CaretCircleLeftIcon, CaretCircleRightIcon, PencilSimpleIcon, PlayCircleIcon, PlusCircleIcon, ShareNetworkIcon, TimerIcon, TrashIcon, UsersThreeIcon, DotsThreeIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/antd/badge";
import { Button } from "@/components/antd/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/antd/table";
import { pillClass, RowsSkeleton, SectionCard } from "@/components/k-page/section-card";
import type { ExamSessionBasic } from "@/types/examRoom";
import { SnapshotOutdatedBanner } from "./snapshot-outdated-banner";

interface Props {
  sessions: ExamSessionBasic[];
  loading: boolean;
  counts: { upcoming: number; ongoing: number; completed: number };
  page: number;
  totalPages: number;
  onPageChange: (updater: (prev: number) => number) => void;
  canManage: boolean;
  refreshingId: string | null;
  onRefreshSnapshot: (sessionId: string) => void;
  onCreate: () => void;
  onShare: (session: ExamSessionBasic) => void;
  onStats: (session: ExamSessionBasic) => void;
  onEdit: (session: ExamSessionBasic) => void;
  onDelete: (session: ExamSessionBasic) => void;
}

function StatusBadge({ startTime, endTime }: { startTime: string; endTime: string }) {
  const now = new Date();
  const start = new Date(startTime);
  const end = endTime ? new Date(endTime) : null;
  if (now < start) return <Badge variant="secondary">Sắp diễn ra</Badge>;
  if ((end && now < end) || !end) return <Badge variant="default">Đang diễn ra</Badge>;
  return <Badge variant="outline">Đã kết thúc</Badge>;
}

const countPill = "inline-flex items-center gap-1 rounded-lg border border-hairline bg-surface-soft px-2.5 py-0.5 text-xs";

export function RoomSessionsSection(p: Props) {
  const header = (
    <div className="flex flex-wrap items-center gap-2">
      <span className={`${countPill} text-brand`}><TimerIcon className="size-3" />{p.counts.upcoming} sắp tới</span>
      <span className={`${countPill} text-emerald-600`}><PlayCircleIcon className="size-3" />{p.counts.ongoing} đang thi</span>
      <span className={`${countPill} text-muted-foreground`}><CheckCircleIcon className="size-3" />{p.counts.completed} đã kết thúc</span>
    </div>
  );

  return (
    <SectionCard icon={<CalendarBlankIcon />} title="Danh sách phiên thi" action={header} plain>
      {p.loading ? (
        <div className="divide-y divide-hairline-soft"><RowsSkeleton rows={4} /></div>
      ) : p.sessions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
          <span className="grid size-10 place-items-center rounded-lg bg-brand-soft text-brand"><CalendarBlankIcon className="size-5" /></span>
          <div>
            <p className="text-sm font-semibold text-ink">Chưa có phiên thi nào</p>
            <p className="mt-1 text-sm text-muted-foreground">Tạo phiên thi đầu tiên để bắt đầu tổ chức bài kiểm tra</p>
          </div>
          <Button onClick={p.onCreate}>
            <PlusCircleIcon className="mr-2 h-4 w-4" />
            Tạo phiên thi đầu tiên
          </Button>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto border-t border-hairline-soft">
            <Table>
              <TableHeader>
                <TableRow className="border-hairline-soft bg-surface-soft/70 hover:bg-transparent">
                  <TableHead className="w-[220px] font-medium text-muted-foreground">Trạng thái</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Thời gian bắt đầu</TableHead>
                  <TableHead className="font-medium text-muted-foreground">Thời gian kết thúc</TableHead>
                  <TableHead className="text-center font-medium text-muted-foreground"><UsersThreeIcon className="mr-1 inline h-4 w-4" />Thí sinh</TableHead>
                  <TableHead className="text-center font-medium text-muted-foreground"><CheckCircleIcon className="mr-1 inline h-4 w-4" />Bài làm</TableHead>
                  <TableHead className="w-[100px] text-right font-medium text-muted-foreground">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {p.sessions.map((session) => (
                  <TableRow key={session.id} className="border-hairline-soft transition-colors hover:bg-surface-soft">
                    <TableCell>
                      <StatusBadge startTime={session.startTime} endTime={session.endTime || ""} />
                      <SnapshotOutdatedBanner
                        drift={session}
                        canManage={p.canManage}
                        pending={p.refreshingId === session.id}
                        onRefresh={() => p.onRefreshSnapshot(session.id)}
                      />
                    </TableCell>
                    <TableCell className="whitespace-nowrap font-medium text-ink">{format(new Date(session.startTime), "dd/MM/yyyy HH:mm")}</TableCell>
                    <TableCell className="whitespace-nowrap">{session.endTime ? format(new Date(session.endTime), "dd/MM/yyyy HH:mm") : <span className="text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="border-hairline">{session.distinctUserCount || 0}</Badge></TableCell>
                    <TableCell className="text-center"><Badge variant="outline" className="border-hairline">{session._count?.examAttempts || 0}</Badge></TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 rounded-full p-0" aria-label="Tùy chọn phiên thi"><DotsThreeIcon className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => p.onShare(session)}><ShareNetworkIcon className="mr-2 h-4 w-4" />Chia sẻ</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => p.onStats(session)}><ChartBarIcon className="mr-2 h-4 w-4" />Xem thống kê</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => p.onEdit(session)}><PencilSimpleIcon className="mr-2 h-4 w-4" />Chỉnh sửa</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => p.onDelete(session)} className="text-red-600 focus:text-red-600"><TrashIcon className="mr-2 h-4 w-4" />Xóa</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {p.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-hairline-soft px-4 py-3 md:px-5">
              <span className="text-sm text-muted-foreground">Trang {p.page} / {p.totalPages}</span>
              <div className="flex items-center gap-2">
                <button type="button" className={`${pillClass} disabled:opacity-50`} onClick={() => p.onPageChange((prev) => prev - 1)} disabled={p.page === 1}>
                  <CaretCircleLeftIcon className="size-4" />
                  Trước
                </button>
                <button type="button" className={`${pillClass} disabled:opacity-50`} onClick={() => p.onPageChange((prev) => prev + 1)} disabled={p.page === p.totalPages}>
                  Sau
                  <CaretCircleRightIcon className="size-4" />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}

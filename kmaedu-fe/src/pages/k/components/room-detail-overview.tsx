import { format } from "date-fns";
import { Calendar, CheckCircle2, Clock, FileText, PlayCircle, Users } from "lucide-react";
import { SectionCard } from "@/components/k-page/section-card";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";
import { displayUserName } from "@/lib/user/display-user-name";
import type { ExamRoom } from "@/types/examRoom";

interface Stats {
  total: number;
  ongoing: number;
  totalParticipants: number;
  totalAttempts: number;
}

export function RoomDetailStats({ stats }: { stats: Stats }) {
  return (
    <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <HistoryStatCard icon={Calendar} title="Tổng phiên thi" value={stats.total} tone="red" />
      <HistoryStatCard icon={PlayCircle} title="Đang diễn ra" value={stats.ongoing} tone="green" />
      <HistoryStatCard icon={Users} title="Thí sinh tham gia" value={stats.totalParticipants} tone="blue" />
      <HistoryStatCard icon={CheckCircle2} title="Lượt làm bài" value={stats.totalAttempts} tone="amber" />
    </div>
  );
}

function InfoCell({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand [&_svg]:size-[18px]">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        {children}
      </div>
    </div>
  );
}

export function RoomInfoCard({ room }: { room: ExamRoom }) {
  return (
    <div className="mb-6">
      <SectionCard icon={<FileText />} title="Thông tin phòng thi" plain>
        <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-3 md:p-5">
          <InfoCell icon={<Calendar />} label="Bộ đề">
            <p className="break-words text-sm text-muted-foreground">{room.quizSet?.title || "Chưa có bộ đề"}</p>
            {room.sourceDeleted && <p className="text-xs text-error">Bộ đề gốc đã bị xóa — không thể tạo phiên thi mới</p>}
          </InfoCell>
          <InfoCell icon={<Users />} label="Người tổ chức">
            <p className="text-sm text-muted-foreground">{displayUserName(room.host)}</p>
          </InfoCell>
          <InfoCell icon={<Clock />} label="Ngày tạo">
            <p className="text-sm text-muted-foreground">{format(new Date(room.createdAt), "dd/MM/yyyy")}</p>
          </InfoCell>
        </div>
      </SectionCard>
    </div>
  );
}

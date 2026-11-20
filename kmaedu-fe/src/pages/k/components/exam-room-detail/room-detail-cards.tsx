import type { ReactNode } from "react";
import { CalendarBlankIcon, CheckIcon, ClockIcon, PlayIcon, UserIcon, UsersThreeIcon, WarningCircleIcon } from "@phosphor-icons/react";
import { StatHighlightCard } from "@/components/k-page/stat-highlight-card";
import { formatStamp, type RoomTimeline } from "@/lib/exam-room/room-status";
import { displayUserName } from "@/lib/user/display-user-name";
import type { ExamRoom } from "@/types/examRoom";

export function RoomDetailStats({ timeline, participants }: { timeline: RoomTimeline; participants: number | null }) {
  const sessions = timeline.ongoing + timeline.upcoming + timeline.ended;
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <StatHighlightCard icon={UsersThreeIcon} label="Tổng phiên thi" value={sessions} tone="red" />
      <StatHighlightCard icon={PlayIcon} label="Đang diễn ra" value={timeline.ongoing} tone="green" />
      <StatHighlightCard icon={CheckIcon} label="Đã kết thúc" value={timeline.ended} tone="violet" />
      <StatHighlightCard icon={UsersThreeIcon} label="Lượt tham gia" value={participants ?? "–"} tone="amber" />
    </div>
  );
}

/** White card with a bold title row, as the detail page's panels are drawn. */
export function DetailPanel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-hairline bg-canvas p-4 shadow-soft md:p-5 ${className ?? ""}`}>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-ink">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function InfoRow({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    // On a phone the value keeps its width (a date never wraps) and the label wraps instead.
    <div className="grid grid-cols-[22px_minmax(0,1fr)_auto] items-center gap-3 py-3.5 sm:grid-cols-[28px_minmax(0,1fr)_minmax(0,1.1fr)] [&_svg]:size-[20px] sm:[&_svg]:size-[22px] [&_svg]:text-body">
      {icon}
      <dt className="text-[15px] text-body">{label}</dt>
      <dd className="max-w-[11rem] truncate text-right text-[15px] font-semibold tabular-nums text-ink sm:max-w-none sm:text-left">{children}</dd>
    </div>
  );
}

/** The room's own facts. End times belong to its sessions (tab Phiên thi), so the card shows when the room was created. */
export function RoomInfoCard({ room, timeline }: { room: ExamRoom; timeline: RoomTimeline }) {
  return (
    <DetailPanel title="Thông tin phòng thi">
      <dl className="divide-y divide-hairline-soft">
        <InfoRow icon={<CalendarBlankIcon aria-hidden />} label="Thời gian bắt đầu">{timeline.startsAt ? formatStamp(timeline.startsAt) : "Chưa có phiên thi"}</InfoRow>
        <InfoRow icon={<ClockIcon aria-hidden />} label="Thời gian tạo">{formatStamp(room.createdAt)}</InfoRow>
        <InfoRow icon={<UserIcon aria-hidden />} label="Người tổ chức">{displayUserName(room.host)}</InfoRow>
      </dl>
      {room.sourceDeleted && (
        <p className="mt-2 flex items-center gap-1.5 text-[13px] text-error">
          <WarningCircleIcon className="size-4 shrink-0" aria-hidden />
          Bộ đề gốc đã bị xóa — không thể tạo phiên thi mới
        </p>
      )}
    </DetailPanel>
  );
}

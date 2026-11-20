import type { ReactNode } from "react";
import { ClockIcon, CubeIcon, InfoIcon, StackIcon, UserIcon } from "@phosphor-icons/react";
import { formatStamp } from "@/lib/exam-room/room-status";
import type { WaitingRoomView } from "@/lib/exam-session/waiting-room-view";
import { WaitingRoomPanel } from "./waiting-room-panel";

function Row({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[24px_minmax(0,1fr)] items-center gap-x-3 gap-y-1 py-3.5 sm:grid-cols-[24px_150px_minmax(0,1fr)]">
      <span className="text-brand [&_svg]:size-[22px]" aria-hidden>{icon}</span>
      <dt className="text-[15px] text-body">{label}</dt>
      <dd className="col-start-2 text-[15px] font-medium text-ink sm:col-start-3">{children}</dd>
    </div>
  );
}

function Stamp({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[13px] text-body">{label}</p>
      <p className="mt-0.5 font-semibold tabular-nums text-ink">{value}</p>
    </div>
  );
}

export function WaitingRoomInfoCard({ view }: { view: WaitingRoomView }) {
  return (
    <WaitingRoomPanel icon={<InfoIcon weight="fill" />} title="Thông tin phòng thi" className="relative overflow-hidden">
      <div className="pointer-events-none absolute -right-6 top-10 hidden h-64 w-72 rounded-[45%] bg-brand-soft/40 md:block" aria-hidden />
      <img
        src="/illustrations/exam-in-progress.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute right-6 top-1/2 hidden size-48 -translate-y-1/2 md:block lg:size-52"
      />
      <dl className="relative divide-y divide-hairline-soft md:max-w-[calc(100%-15rem)]">
        <Row icon={<CubeIcon />} label="Bộ đề">{view.quizSetTitle}</Row>
        <Row icon={<StackIcon />} label="Loại đề">Trắc nghiệm</Row>
        <Row icon={<ClockIcon />} label="Thời gian">
          <div className="grid grid-cols-2 gap-4 sm:divide-x sm:divide-hairline-soft">
            <Stamp label="Thời gian bắt đầu" value={formatStamp(view.startTime)} />
            <div className="sm:pl-4">
              <Stamp label="Thời gian kết thúc" value={view.endTime ? formatStamp(view.endTime) : "Không giới hạn"} />
            </div>
          </div>
        </Row>
        <Row icon={<UserIcon />} label="Người tổ chức">{view.hostName}</Row>
      </dl>
    </WaitingRoomPanel>
  );
}

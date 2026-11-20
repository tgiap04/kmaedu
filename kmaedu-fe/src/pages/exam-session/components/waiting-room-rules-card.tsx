import type { ReactNode } from "react";
import { HourglassMediumIcon, LockSimpleIcon, ShieldCheckIcon, SignOutIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { durationLabel, type WaitingRoomView } from "@/lib/exam-session/waiting-room-view";
import { WaitingRoomPanel } from "./waiting-room-panel";

function Rule({ icon, tile, label, value }: { icon: ReactNode; tile: string; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-hairline-soft px-3 py-3">
      <span className={cn("grid size-10 shrink-0 place-items-center rounded-full [&_svg]:size-5", tile)} aria-hidden>{icon}</span>
      <div className="min-w-0">
        <p className="text-[13px] text-body">{label}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  );
}

/** The session's attempt rules as the candidate meets them. Signing in is always required. */
export function WaitingRoomRulesCard({ view }: { view: WaitingRoomView }) {
  return (
    <WaitingRoomPanel icon={<ShieldCheckIcon weight="fill" />} title="Quy định & Bảo mật">
      <div className="grid gap-2.5 sm:grid-cols-2 2xl:grid-cols-4">
        <Rule icon={<HourglassMediumIcon weight="duotone" />} tile="bg-brand-soft text-brand" label="Giới hạn thời gian làm bài" value={durationLabel(view.attemptMinutes)} />
        <Rule
          icon={<ShieldCheckIcon weight="duotone" />}
          tile="bg-emerald-100/80 text-emerald-600"
          label="Chống gian lận"
          value={view.antiCheatEnabled ? "Bật chế độ giám sát" : "Không giám sát"}
        />
        <Rule
          icon={<SignOutIcon weight="duotone" />}
          tile="bg-amber-100/80 text-amber-600"
          label="Cho phép thoát giữa chừng"
          value={view.allowLeaveMidway ? "Có" : "Không, rời trang sẽ nộp bài"}
        />
        <Rule icon={<LockSimpleIcon weight="duotone" />} tile="bg-amber-100/80 text-amber-600" label="Yêu cầu đăng nhập" value="Bắt buộc" />
      </div>
    </WaitingRoomPanel>
  );
}

import type { ReactNode } from "react";
import type { WaitingRoomView } from "@/lib/exam-session/waiting-room-view";
import { WaitingRoomHeader } from "./waiting-room-header";
import { WaitingRoomInfoCard } from "./waiting-room-info-card";
import { WaitingRoomRulesCard } from "./waiting-room-rules-card";
import { WaitingRoomStats } from "./waiting-room-stats";

interface Props {
  view: WaitingRoomView;
  crumb: { label: string; to: string };
  actions?: ReactNode;
  notice?: ReactNode;
  /** Right column: the host's candidates, or the candidate's own attempts. */
  aside: ReactNode;
  footer: ReactNode;
}

/** The waiting page before an attempt, as the design draws it: header, facts on the left, a panel on the right, a pinned start bar. */
export function WaitingRoomLayout({ view, crumb, actions, notice, aside, footer }: Props) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="w-full flex-1 space-y-5 px-4 pt-6 xl:px-6 2xl:px-8">
        <WaitingRoomHeader title={view.title} subtitle={view.subtitle} crumb={crumb} actions={actions} />
        {notice}
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_400px]">
          <div className="min-w-0 space-y-5">
            <WaitingRoomStats view={view} />
            <WaitingRoomInfoCard view={view} />
            <WaitingRoomRulesCard view={view} />
          </div>
          <aside className="min-w-0">{aside}</aside>
        </div>
      </div>
      {footer}
    </div>
  );
}

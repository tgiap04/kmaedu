import { memo } from "react";
import { UsersThreeIcon } from "@phosphor-icons/react";
import { SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { cn } from "@/lib/utils";

export interface Participant {
  id: string;
  name: string;
  examName: string;
  status: "online" | "offline" | "away";
}

interface RecentParticipantsListProps {
  participants: Participant[];
  onViewAll?: () => void;
}

const statusColors = {
  online: "bg-emerald-500",
  offline: "bg-muted-foreground/40",
  away: "bg-amber-500",
};

const RecentParticipantsListComponent = ({
  participants,
  onViewAll: _onViewAll,
}: RecentParticipantsListProps) => {
  return (
    <SectionCard icon={<UsersThreeIcon />} title="Thí sinh gần đây">
      {participants.length === 0 ? (
        <SectionMessage title="Chưa có thí sinh gần đây" />
      ) : (
        participants.map((participant) => (
          <div key={participant.id} className="flex items-center gap-3 px-4 py-2.5 md:px-5">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">
              {participant.name.charAt(0).toUpperCase()}
              <span className={cn("absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-canvas", statusColors[participant.status])} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-ink">{participant.name}</p>
              <p className="truncate text-[12px] text-muted-foreground">{participant.examName}</p>
            </div>
          </div>
        ))
      )}
    </SectionCard>
  );
};

RecentParticipantsListComponent.displayName = "RecentParticipantsList";

export const RecentParticipantsList = memo(RecentParticipantsListComponent);

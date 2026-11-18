import { BookOpenIcon, FileTextIcon, FireIcon, TrophyIcon, type Icon as AppIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ActivityType = "exam_score" | "pdf_processed" | "flashcard_created" | "study_streak";

export interface RecentActivityItemData {
  id: string;
  type: ActivityType;
  title: string;
  /** Bold subject right after the title, e.g. the file name. */
  highlight?: string;
  description: string;
  timestamp: string;
}

interface RecentActivityItemProps {
  item: RecentActivityItemData;
}

const activityConfig: Record<ActivityType, { icon: AppIcon; iconColor: string }> = {
  exam_score: { icon: TrophyIcon, iconColor: "text-emerald-600" },
  pdf_processed: { icon: FileTextIcon, iconColor: "text-brand" },
  flashcard_created: { icon: BookOpenIcon, iconColor: "text-amber-500" },
  study_streak: { icon: FireIcon, iconColor: "text-amber-500" },
};

export function RecentActivityItem({ item }: RecentActivityItemProps) {
  const { icon: Icon, iconColor } = activityConfig[item.type];

  return (
    <div className="flex items-start gap-3 py-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline-soft bg-canvas shadow-soft">
        <Icon className={cn("size-[18px]", iconColor)} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-body">
          <span className="font-semibold text-ink">{item.title}</span>
          {item.highlight && <span className="font-semibold text-ink">{` ${item.highlight}`}</span>}
          {` ${item.description}`}
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{item.timestamp}</p>
      </div>
    </div>
  );
}

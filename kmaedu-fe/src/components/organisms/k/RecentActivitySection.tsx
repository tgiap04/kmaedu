import { memo } from "react";
import { SparkleIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import {
  RecentActivityItem,
  type RecentActivityItemData,
} from "@/components/molecules/RecentActivityItem";

interface RecentActivitySectionProps {
  activities: RecentActivityItemData[];
  maxItems?: number;
  /** Target of the round arrow on the right; hidden when undefined. */
  viewAllTo?: string;
}

const RecentActivitySectionComponent = ({
  activities,
  maxItems = 5,
  viewAllTo,
}: RecentActivitySectionProps) => {
  const displayActivities = activities.slice(0, maxItems);

  return (
    <section className="relative overflow-hidden rounded-lg border border-brand-border/60 bg-gradient-to-r from-brand-soft via-[#fff6f5] to-brand-soft p-4 shadow-soft">
      <div className="flex items-center gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-canvas text-brand shadow-soft">
              <SparkleIcon className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-ink">Hoạt động gần đây</h2>
              <p className="text-sm text-muted-foreground">Các hoạt động và thành tích học tập mới nhất</p>
            </div>
          </div>

          <div className="mt-3 sm:pl-[52px]">
            {displayActivities.length > 0 ? (
              displayActivities.map((activity) => (
                <RecentActivityItem key={activity.id} item={activity} />
              ))
            ) : (
              <p className="py-4 text-sm text-muted-foreground">Chưa có hoạt động nào</p>
            )}
          </div>
        </div>

        <img
          src="/illustrations/pdf-processed.svg"
          alt=""
          aria-hidden
          width={200}
          height={140}
          className="hidden w-40 shrink-0 lg:block"
        />

        {viewAllTo && (
          <Link
            to={viewAllTo}
            aria-label="Xem tất cả hoạt động"
            className="hidden size-10 shrink-0 items-center justify-center rounded-full bg-canvas text-brand shadow-raised transition-transform hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:flex"
          >
            <ArrowRightIcon className="size-5" aria-hidden />
          </Link>
        )}
      </div>
    </section>
  );
};

RecentActivitySectionComponent.displayName = "RecentActivitySection";

export const RecentActivitySection = memo(RecentActivitySectionComponent);

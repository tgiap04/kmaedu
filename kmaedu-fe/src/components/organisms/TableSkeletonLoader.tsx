"use client";

import { Skeleton } from "@/components/antd/skeleton";
import { RowsSkeleton } from "@/components/k-page/section-card";

interface TableSkeletonLoaderProps {
  /**
   * Số lượng dòng skeleton cần hiển thị
   * @default 5
   */
  rows?: number;
  /**
   * Hiển thị skeleton cho stats section
   * @default true
   */
  showStats?: boolean;
  /**
   * Hiển thị skeleton cho search bar
   * @default true
   */
  showSearchBar?: boolean;
}

const cardClass = "rounded-[20px] border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]";

/** Loading state shaped like the /k management pages: header, stat tiles, filter bar, list card. */
export function TableSkeletonLoader({
  rows = 5,
  showStats = true,
  showSearchBar = true,
}: TableSkeletonLoaderProps) {
  return (
    <div className="flex flex-col gap-5" aria-busy="true">
      <div className="mb-1 flex flex-wrap items-center gap-4">
        <Skeleton className="size-16 rounded-2xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-full max-w-sm" />
        </div>
        <Skeleton className="h-10 w-32 rounded-full" />
      </div>

      {showStats && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div key={index} className="rounded-2xl border border-hairline bg-canvas p-5 shadow-soft">
              <div className="flex items-center gap-3">
                <Skeleton className="size-9 rounded-lg" />
                <Skeleton className="h-4 w-24" />
              </div>
              <Skeleton className="mt-3 h-8 w-16" />
            </div>
          ))}
        </div>
      )}

      {showSearchBar && (
        <div className={`${cardClass} flex flex-col gap-3 p-3 md:flex-row md:px-5`}>
          <Skeleton className="h-10 w-full md:max-w-md" />
          <Skeleton className="h-10 w-40" />
        </div>
      )}

      <div className={`${cardClass} overflow-hidden`}>
        <div className="flex items-center gap-2.5 px-4 py-3 md:px-5">
          <Skeleton className="size-9 rounded-lg" />
          <Skeleton className="h-5 w-32" />
        </div>
        <div className="divide-y divide-hairline-soft border-t border-hairline-soft">
          <RowsSkeleton rows={rows} />
        </div>
      </div>
    </div>
  );
}

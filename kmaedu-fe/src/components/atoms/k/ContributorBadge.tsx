import { Badge } from "@/components/antd/badge";
import { CrownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface ContributorBadgeProps {
  rank: number;
  className?: string;
}

export function ContributorBadge({ rank, className }: ContributorBadgeProps) {
  if (rank !== 1) return null;

  return (
    <Badge
      variant="secondary"
      className={cn(
        "h-5 w-5 rounded-full border-0 bg-yellow-100 p-0",
        className
      )}>
      <CrownIcon className="h-3 w-3 text-yellow-600" />
    </Badge>
  );
}

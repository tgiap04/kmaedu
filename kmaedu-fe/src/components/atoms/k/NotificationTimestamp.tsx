import { ClockIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NotificationTimestampProps {
  time: string;
  className?: string;
  showIcon?: boolean;
}

export function NotificationTimestamp({
  time,
  className,
  showIcon = false,
}: NotificationTimestampProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-1 text-xs text-muted-foreground",
        className
      )}>
      {showIcon && <ClockIcon className="h-3 w-3" />}
      <span>{time}</span>
    </div>
  );
}

import { ClockIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface CountdownTimerProps {
  hours: number;
  minutes: number;
  seconds: number;
  label?: string;
  description?: string;
  className?: string;
}

export function CountdownTimer({
  hours,
  minutes,
  seconds,
  label = "Thời gian còn lại",
  description,
  className,
}: CountdownTimerProps) {
  const timeString = `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        className
      )}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-purple-500">
        <ClockIcon className="h-6 w-6 text-white" />
      </div>
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
          {timeString}
        </p>
        {description && (
          <p className="mt-1 text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

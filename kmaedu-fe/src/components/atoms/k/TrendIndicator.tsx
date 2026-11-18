import { TrendUpIcon, TrendDownIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface TrendIndicatorProps {
  value: number;
  className?: string;
}

export function TrendIndicator({ value, className }: TrendIndicatorProps) {
  const isPositive = value >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center text-xs font-medium",
        isPositive ? "text-green-600" : "text-red-600",
        className
      )}>
      {isPositive ? (
        <TrendUpIcon className="h-3 w-3 mr-0.5" />
      ) : (
        <TrendDownIcon className="h-3 w-3 mr-0.5" />
      )}
      {isPositive ? "+" : ""}
      {value}%
    </span>
  );
}

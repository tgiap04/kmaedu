import { CheckCircleIcon, type Icon as AppIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface SystemCheckItemProps {
  icon: AppIcon;
  label: string;
  checked?: boolean;
}

export function SystemCheckItem({
  icon: Icon,
  label,
  checked = true,
}: SystemCheckItemProps) {
  return (
    <div className="flex items-center gap-2">
      {checked ? (
        <CheckCircleIcon className="h-4 w-4 text-green-500" />
      ) : (
        <Icon className="h-4 w-4 text-muted-foreground" />
      )}
      <span className={cn("text-sm", checked && "text-foreground")}>
        {label}
      </span>
    </div>
  );
}

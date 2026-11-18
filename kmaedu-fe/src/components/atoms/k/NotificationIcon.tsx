import { WarningIcon, ChatCenteredTextIcon, WrenchIcon, UserPlusIcon, CalendarBlankIcon, type Icon as AppIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface NotificationIconProps {
  type: "security" | "message" | "system" | "team" | "meeting";
  className?: string;
}

const iconMap: Record<string, { icon: AppIcon; bgClass: string }> = {
  security: {
    icon: WarningIcon,
    bgClass: "bg-red-100 text-red-600",
  },
  message: {
    icon: ChatCenteredTextIcon,
    bgClass: "bg-red-100 text-primary",
  },
  system: {
    icon: WrenchIcon,
    bgClass:
      "bg-yellow-100 text-yellow-600",
  },
  team: {
    icon: UserPlusIcon,
    bgClass:
      "bg-orange-100 text-orange-600",
  },
  meeting: {
    icon: CalendarBlankIcon,
    bgClass:
      "bg-yellow-100 text-yellow-600",
  },
};

export function NotificationIcon({ type, className }: NotificationIconProps) {
  const { icon: Icon, bgClass } = iconMap[type] || iconMap.message;

  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        bgClass,
        className
      )}>
      <Icon className="h-5 w-5" />
    </div>
  );
}

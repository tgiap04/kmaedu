import { Card } from "@/components/antd/card";
import { NotificationFilterButton } from "@/components/molecules/NotificationFilterButton";
import { NotificationActions } from "@/components/molecules/NotificationActions";
import { BellIcon, CircleIcon, UserIcon, ShieldIcon, GearSixIcon } from "@phosphor-icons/react";

export type NotificationFilter =
  | "all"
  | "unread"
  | "account"
  | "security"
  | "system";

interface NotificationFilterSidebarProps {
  activeFilter: NotificationFilter;
  onFilterChange: (filter: NotificationFilter) => void;
  counts: Record<NotificationFilter, number>;
  onArchiveAll: () => void;
  onDeleteOld: () => void;
}

export function NotificationFilterSidebar({
  activeFilter,
  onFilterChange,
  counts,
  onArchiveAll,
  onDeleteOld,
}: NotificationFilterSidebarProps) {
  return (
    <Card className="p-4">
      <div className="space-y-1">
        <p className="px-4 pb-2 text-xs font-semibold uppercase text-muted-foreground">
          Lọc thông báo
        </p>

        <NotificationFilterButton
          icon={BellIcon}
          label="Tất cả thông báo"
          count={counts.all}
          isActive={activeFilter === "all"}
          onClick={() => onFilterChange("all")}
        />

        <NotificationFilterButton
          icon={CircleIcon}
          label="Chưa đọc"
          count={counts.unread}
          isActive={activeFilter === "unread"}
          onClick={() => onFilterChange("unread")}
        />

        <NotificationFilterButton
          icon={UserIcon}
          label="Tài khoản"
          count={counts.account}
          isActive={activeFilter === "account"}
          onClick={() => onFilterChange("account")}
        />

        <NotificationFilterButton
          icon={ShieldIcon}
          label="Bảo mật"
          count={counts.security}
          isActive={activeFilter === "security"}
          onClick={() => onFilterChange("security")}
        />

        <NotificationFilterButton
          icon={GearSixIcon}
          label="Hệ thống"
          count={counts.system}
          isActive={activeFilter === "system"}
          onClick={() => onFilterChange("system")}
        />
      </div>

      <NotificationActions
        onArchiveAll={onArchiveAll}
        onDeleteOld={onDeleteOld}
      />
    </Card>
  );
}

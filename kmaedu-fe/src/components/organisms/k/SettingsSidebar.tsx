import { Card } from "@/components/antd/card";
import { SettingsSidebarItem } from "@/components/molecules/SettingsSidebarItem";
import { PaletteIcon, MonitorIcon, BellIcon, LockSimpleIcon, UserIcon, StackIcon } from "@phosphor-icons/react";

export type SettingsSection =
  | "theme"
  | "interface"
  | "notifications"
  | "privacy"
  | "account"
  | "integrations";

interface SettingsSidebarProps {
  activeSection: SettingsSection;
  onSectionChange: (section: SettingsSection) => void;
}

export function SettingsSidebar({
  activeSection,
  onSectionChange,
}: SettingsSidebarProps) {
  return (
    <Card className="p-4">
      <div className="space-y-1">
        <p className="px-4 pb-2 text-xs font-semibold uppercase text-muted-foreground">
          Cài đặt
        </p>

        <SettingsSidebarItem
          icon={PaletteIcon}
          label="Chủ đề"
          isActive={activeSection === "theme"}
          onClick={() => onSectionChange("theme")}
        />

        <SettingsSidebarItem
          icon={MonitorIcon}
          label="Giao diện"
          isActive={activeSection === "interface"}
          onClick={() => onSectionChange("interface")}
        />

        <SettingsSidebarItem
          icon={BellIcon}
          label="Thông báo"
          isActive={activeSection === "notifications"}
          onClick={() => onSectionChange("notifications")}
        />

        <SettingsSidebarItem
          icon={LockSimpleIcon}
          label="Bảo mật & Quyền riêng tư"
          isActive={activeSection === "privacy"}
          onClick={() => onSectionChange("privacy")}
        />

        <SettingsSidebarItem
          icon={UserIcon}
          label="Tài khoản"
          isActive={activeSection === "account"}
          onClick={() => onSectionChange("account")}
        />

        <SettingsSidebarItem
          icon={StackIcon}
          label="Tích hợp"
          isActive={activeSection === "integrations"}
          onClick={() => onSectionChange("integrations")}
        />
      </div>
    </Card>
  );
}

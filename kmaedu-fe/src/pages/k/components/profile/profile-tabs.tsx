import type { LucideIcon } from "lucide-react";
import { Monitor, Shield, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ProfileTab = "profile" | "security" | "devices";

const TABS: { id: ProfileTab; label: string; icon: LucideIcon }[] = [
  { id: "profile", label: "Hồ sơ", icon: User },
  { id: "security", label: "Bảo mật", icon: Shield },
  { id: "devices", label: "Thiết bị", icon: Monitor },
];

export function ProfileTabs({ active, onChange }: { active: ProfileTab; onChange: (tab: ProfileTab) => void }) {
  return (
    <div className="flex w-full gap-1 overflow-x-auto rounded-full border border-hairline bg-surface-soft p-1 sm:w-auto sm:self-start" role="tablist">
      {TABS.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          role="tab"
          aria-selected={active === id}
          onClick={() => onChange(id)}
          className={cn(
            "inline-flex flex-1 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-full px-5 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:flex-initial",
            active === id ? "border border-brand-border bg-brand-soft text-brand shadow-sm" : "text-body hover:bg-canvas hover:text-ink",
          )}
        >
          <Icon className="h-4 w-4" />
          {label}
        </button>
      ))}
    </div>
  );
}

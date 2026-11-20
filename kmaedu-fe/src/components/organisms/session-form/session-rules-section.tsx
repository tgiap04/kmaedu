import { ShieldCheckIcon } from "@phosphor-icons/react";
import { Switch } from "@/components/antd/switch";
import { SessionFormSection, SwitchRow } from "./session-form-section";

export interface SessionRulesValue {
  antiCheatEnabled: boolean;
  allowLeaveMidway: boolean;
}

interface Props {
  value: SessionRulesValue;
  disabled: boolean;
  onChange: (patch: Partial<SessionRulesValue>) => void;
}

/** Anti-cheat and leaving midway. Login is always required, so it is stated, not offered. */
export function SessionRulesSection({ value, disabled, onChange }: Props) {
  return (
    <SessionFormSection icon={<ShieldCheckIcon weight="duotone" />} title="Quy định & Bảo mật" hint="Giám sát trong lúc làm bài. Thi luôn yêu cầu đăng nhập.">
      <div className="divide-y divide-hairline-soft">
        <SwitchRow
          label="Chống gian lận"
          detail={value.antiCheatEnabled ? "Giám sát và ghi lại việc chuyển tab" : "Không theo dõi việc chuyển tab"}
          control={
            <Switch aria-label="Chống gian lận" checked={value.antiCheatEnabled} onCheckedChange={(antiCheatEnabled) => onChange({ antiCheatEnabled })} disabled={disabled} />
          }
        />
        <SwitchRow
          label="Cho phép thoát giữa chừng"
          detail={value.allowLeaveMidway ? "Rời trang rồi quay lại làm tiếp được" : "Rời trang làm bài sẽ tự động nộp bài"}
          control={
            <Switch aria-label="Cho phép thoát giữa chừng" checked={value.allowLeaveMidway} onCheckedChange={(allowLeaveMidway) => onChange({ allowLeaveMidway })} disabled={disabled} />
          }
        />
      </div>
    </SessionFormSection>
  );
}

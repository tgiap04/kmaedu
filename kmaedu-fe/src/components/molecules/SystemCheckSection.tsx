import { Card } from "@/components/antd/card";
import { SystemCheckItem } from "@/components/atoms/k/SystemCheckItem";
import { MonitorIcon, WifiHighIcon, CameraIcon, MicrophoneIcon } from "@phosphor-icons/react";

interface SystemCheck {
  icon: typeof MonitorIcon | typeof WifiHighIcon | typeof CameraIcon | typeof MicrophoneIcon;
  label: string;
  checked: boolean;
}

interface SystemCheckSectionProps {
  checks?: SystemCheck[];
}

const defaultChecks: SystemCheck[] = [
  { icon: MonitorIcon, label: "Trình duyệt tương thích", checked: true },
  { icon: WifiHighIcon, label: "Kết nối Internet", checked: true },
  { icon: CameraIcon, label: "Quyền truy cập Camera", checked: true },
  { icon: MicrophoneIcon, label: "Quyền truy cập Microphone", checked: true },
];

export function SystemCheckSection({
  checks = defaultChecks,
}: SystemCheckSectionProps) {
  return (
    <Card className="border-green-500/20 bg-green-500/5 p-4">
      <div className="mb-3 flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-green-500" />
        <h3 className="font-semibold text-foreground">
          Kiểm tra hệ thống hoàn tất
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {checks.map((check, index) => (
          <SystemCheckItem
            key={index}
            icon={check.icon}
            label={check.label}
            checked={check.checked}
          />
        ))}
      </div>
    </Card>
  );
}

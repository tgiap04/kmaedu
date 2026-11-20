import { CalendarBlankIcon } from "@phosphor-icons/react";
import { Input } from "@/components/antd/input";
import { Switch } from "@/components/antd/switch";
import { FieldError, fieldLabel, SessionFormSection } from "./session-form-section";

export interface SessionTimeValue {
  startTime: string;
  endTime: string;
  /** Minutes one attempt may last; null: until the session ends. */
  durationMinutes: number | null;
}

interface Props {
  value: SessionTimeValue;
  errors: Partial<Record<keyof SessionTimeValue, string>>;
  disabled: boolean;
  onChange: (patch: Partial<SessionTimeValue>) => void;
}

const DEFAULT_MINUTES = 30;

/** Error for the duration field, or undefined when valid. */
export function durationError(minutes: number | null): string | undefined {
  if (minutes === null) return undefined;
  return Number.isInteger(minutes) && minutes >= 1 && minutes <= 1440 ? undefined : "Thời gian làm bài từ 1 đến 1440 phút";
}

/** When the session opens and closes, and how long one attempt may last. */
export function SessionTimeSection({ value, errors, disabled, onChange }: Props) {
  const limited = value.durationMinutes !== null;
  return (
    <SessionFormSection icon={<CalendarBlankIcon weight="duotone" />} title="Thời gian" hint="Khi nào phiên mở, khi nào đóng và mỗi lượt làm bao lâu">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="session-start" className={fieldLabel}>
            Thời gian bắt đầu <span className="text-brand">*</span>
          </label>
          <Input
            id="session-start"
            type="datetime-local"
            value={value.startTime}
            onChange={(e) => onChange({ startTime: e.target.value })}
            disabled={disabled}
            status={errors.startTime ? "error" : undefined}
            className="!h-11 !text-[16px]"
          />
          <FieldError message={errors.startTime} />
        </div>
        <div>
          <label htmlFor="session-end" className={fieldLabel}>Thời gian kết thúc</label>
          <Input
            id="session-end"
            type="datetime-local"
            value={value.endTime}
            onChange={(e) => onChange({ endTime: e.target.value })}
            disabled={disabled}
            className="!h-11 !text-[16px]"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">Để trống: mở tới khi bạn kết thúc phòng</p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg bg-surface-soft px-4 py-3">
        <Switch
          aria-label="Giới hạn thời gian làm bài"
          checked={limited}
          onCheckedChange={(on) => onChange({ durationMinutes: on ? DEFAULT_MINUTES : null })}
          disabled={disabled}
        />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-ink">Giới hạn thời gian làm bài</p>
          <p className="text-[13px] text-body">
            {limited ? "Mỗi lượt kết thúc sau số phút này, không quá giờ đóng phiên" : "Thí sinh làm tới khi phiên đóng"}
          </p>
        </div>
        {limited && (
          <div className="flex items-center gap-2">
            <Input
              type="number"
              aria-label="Số phút mỗi lượt làm"
              min={1}
              max={1440}
              value={value.durationMinutes ?? ""}
              onChange={(e) => onChange({ durationMinutes: e.target.value === "" ? Number.NaN : Number(e.target.value) })}
              disabled={disabled}
              status={errors.durationMinutes ? "error" : undefined}
              className="!h-10 !w-24 !text-[16px]"
            />
            <span className="text-sm text-body">phút</span>
          </div>
        )}
      </div>
      <FieldError message={errors.durationMinutes} />
    </SessionFormSection>
  );
}

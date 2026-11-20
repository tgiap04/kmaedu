import { TrophyIcon } from "@phosphor-icons/react";
import { Input } from "@/components/antd/input";
import { Switch } from "@/components/antd/switch";
import { FieldError, fieldLabel, SessionFormSection, SwitchRow } from "./session-form-section";

export interface SessionScoringValue {
  allowRetake: boolean;
  /** Total number of attempts (the server's limit). */
  maxAttempts: number;
  passingScore: number;
  showAnswersAfterSubmit: boolean;
}

interface Props {
  value: SessionScoringValue;
  errors: Partial<Record<keyof SessionScoringValue, string>>;
  disabled: boolean;
  onChange: (patch: Partial<SessionScoringValue>) => void;
}

/** Attempts, the pass mark and what candidates see after handing in. */
export function SessionScoringSection({ value, errors, disabled, onChange }: Props) {
  return (
    <SessionFormSection icon={<TrophyIcon weight="duotone" />} title="Chấm điểm & kết quả" hint="Số lần làm, điểm đạt và việc xem đáp án">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="session-passing-score" className={fieldLabel}>Điểm đạt (%)</label>
          <Input
            id="session-passing-score"
            type="number"
            min={0}
            max={100}
            value={value.passingScore}
            onChange={(e) => onChange({ passingScore: Math.min(100, Math.max(0, Number.parseInt(e.target.value) || 0)) })}
            disabled={disabled}
            className="!h-11 !text-[16px]"
          />
        </div>
        {value.allowRetake && (
          <div>
            <label htmlFor="session-max-attempts" className={fieldLabel}>Số lần làm tối đa</label>
            <Input
              id="session-max-attempts"
              type="number"
              min={1}
              max={10}
              value={value.maxAttempts}
              onChange={(e) => onChange({ maxAttempts: Number.parseInt(e.target.value) || 1 })}
              disabled={disabled}
              status={errors.maxAttempts ? "error" : undefined}
              className="!h-11 !text-[16px]"
            />
            <FieldError message={errors.maxAttempts} />
          </div>
        )}
      </div>

      <div className="mt-4 divide-y divide-hairline-soft border-t border-hairline-soft pt-3">
        <SwitchRow
          label="Cho phép làm lại"
          detail={value.allowRetake ? `Mỗi thí sinh làm tối đa ${value.maxAttempts || 1} lần` : "Mỗi thí sinh làm một lần"}
          control={<Switch aria-label="Cho phép làm lại" checked={value.allowRetake} onCheckedChange={(allowRetake) => onChange({ allowRetake })} disabled={disabled} />}
        />
        <SwitchRow
          label="Xem đáp án sau khi nộp"
          detail="Thí sinh xem được đáp án và câu mình đã chọn"
          control={
            <Switch
              aria-label="Xem đáp án sau khi nộp"
              checked={value.showAnswersAfterSubmit}
              onCheckedChange={(showAnswersAfterSubmit) => onChange({ showAnswersAfterSubmit })}
              disabled={disabled}
            />
          }
        />
      </div>
    </SessionFormSection>
  );
}

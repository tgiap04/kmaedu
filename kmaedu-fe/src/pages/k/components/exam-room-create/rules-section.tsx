import { forwardRef, type ReactNode } from "react";
import { Switch } from "antd";
import { CalendarBlankIcon, ShieldCheckIcon, XCircleIcon } from "@phosphor-icons/react";
import type { CreateRoomDraft, DraftErrors } from "@/lib/exam-room/create-room-draft";
import { cn } from "@/lib/utils";
import { CreateSection, FieldError } from "./create-section";

interface Props {
  draft: CreateRoomDraft;
  errors: DraftErrors;
  disabled: boolean;
  onChange: (patch: Partial<CreateRoomDraft>) => void;
}

/** A rule row of the design: label, switch, then what the switch does (or its own control). */
function RuleRow({ id, label, checked, disabled, onChange, children }: {
  id: string;
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (checked: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="grid items-center gap-x-5 gap-y-2 sm:grid-cols-[11.5rem_auto_minmax(0,1fr)]">
      <span id={id} className="text-sm font-medium text-ink">{label}</span>
      <Switch aria-labelledby={id} checked={checked} disabled={disabled} onChange={onChange} className="justify-self-start" />
      <div className="min-w-0 text-[13px] text-body">{children}</div>
    </div>
  );
}

/** Step 3: when joining closes, cheating detection, and whether a candidate may leave the quiz page and come back. */
export const RulesSection = forwardRef<HTMLElement, Props>(({ draft, errors, disabled, onChange }, ref) => (
  <CreateSection ref={ref} id="room-rules" icon={<ShieldCheckIcon weight="duotone" />} title="Quy định & Bảo mật" subtitle="Thiết lập các quy định và biện pháp bảo mật cho phòng thi">
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:gap-0">
      <div className="space-y-4 lg:pr-6">
        <RuleRow
          id="rule-deadline"
          label="Giới hạn thời gian tham gia"
          checked={draft.limitJoinWindow}
          disabled={disabled}
          onChange={(limitJoinWindow) => onChange({ limitJoinWindow })}
        >
          {draft.limitJoinWindow ? (
            <>
              <div
                className={cn(
                  "flex h-11 max-w-72 items-center gap-2.5 rounded-lg border bg-canvas px-3 focus-within:border-brand",
                  errors.joinDeadline ? "border-red-500" : "border-hairline",
                )}
              >
                <button
                  type="button"
                  aria-label="Mở lịch chọn hạn tham gia"
                  disabled={disabled}
                  onClick={(e) => (e.currentTarget.nextElementSibling as HTMLInputElement | null)?.showPicker?.()}
                  className="grid size-8 shrink-0 place-items-center text-ink hover:text-brand"
                >
                  <CalendarBlankIcon className="size-5" aria-hidden />
                </button>
                <input
                  type="datetime-local"
                  aria-label="Hạn tham gia"
                  aria-invalid={!!errors.joinDeadline}
                  value={draft.joinDeadline}
                  disabled={disabled}
                  onChange={(e) => onChange({ joinDeadline: e.target.value })}
                  className="min-w-0 flex-1 bg-transparent text-[16px] text-ink outline-none [&::-webkit-calendar-picker-indicator]:hidden"
                />
                {draft.joinDeadline && (
                  <button type="button" aria-label="Xoá hạn tham gia" onClick={() => onChange({ joinDeadline: "" })} className="grid size-8 place-items-center text-muted-foreground hover:text-ink">
                    <XCircleIcon className="size-[18px]" />
                  </button>
                )}
              </div>
              <FieldError id="room-deadline-error" message={errors.joinDeadline} />
              <p className="mt-1.5 text-xs text-muted-foreground">Phiên thi đóng lúc này, bài đang làm dở cũng kết thúc theo.</p>
            </>
          ) : (
            "Phiên thi mở cho tới khi bạn kết thúc phòng"
          )}
        </RuleRow>

        <RuleRow
          id="rule-anti-cheat"
          label="Chống gian lận"
          checked={draft.antiCheatEnabled}
          disabled={disabled}
          onChange={(antiCheatEnabled) => onChange({ antiCheatEnabled })}
        >
          {draft.antiCheatEnabled ? "Bật chế độ giám sát và giới hạn chuyển tab" : "Không theo dõi việc chuyển tab"}
        </RuleRow>
      </div>

      <div className="border-hairline-soft lg:border-l lg:pl-6">
        <RuleRow
          id="rule-leave"
          label="Cho phép thoát giữa chừng"
          checked={draft.allowLeaveMidway}
          disabled={disabled}
          onChange={(allowLeaveMidway) => onChange({ allowLeaveMidway })}
        >
          {draft.allowLeaveMidway ? "Thí sinh có thể tạm rời phòng thi và quay lại làm tiếp" : "Rời trang làm bài sẽ tự động nộp bài"}
        </RuleRow>
      </div>
    </div>
  </CreateSection>
));
RulesSection.displayName = "RulesSection";

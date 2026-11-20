import { forwardRef } from "react";
import { InputNumber, Radio, Select, Switch, Tooltip } from "antd";
import { AlarmIcon, ChartBarIcon, GearSixIcon, InfoIcon, MinusIcon, PlusIcon } from "@phosphor-icons/react";
import {
  ATTEMPT_OPTIONS,
  DURATION_MAX,
  DURATION_MIN,
  type CreateRoomDraft,
  type DraftErrors,
} from "@/lib/exam-room/create-room-draft";
import { CreateSection, FieldError, FieldLabel } from "./create-section";

interface Props {
  draft: CreateRoomDraft;
  errors: DraftErrors;
  /** Size of the chosen quiz set, when known (caps the question count). */
  questionTotal?: number;
  disabled: boolean;
  onChange: (patch: Partial<CreateRoomDraft>) => void;
}

const STEP = 5;
const clampMinutes = (value: number) => Math.min(DURATION_MAX, Math.max(DURATION_MIN, value));

/** Step 2: how long one attempt lasts, how many attempts, which questions, and whether results show after hand-in. */
export const ExamConfigSection = forwardRef<HTMLElement, Props>(({ draft, errors, questionTotal, disabled, onChange }, ref) => {
  const minutes = draft.durationMinutes;
  return (
    <CreateSection ref={ref} id="room-config" icon={<GearSixIcon weight="duotone" />} title="Cấu hình bài thi" subtitle="Thiết lập các thông số cho phòng thi">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:gap-0">
        <div className="grid gap-5 sm:grid-cols-2 lg:pr-6">
          <div>
            <FieldLabel htmlFor="room-duration" icon={<AlarmIcon />} required>Thời gian làm bài</FieldLabel>
            <div className="flex h-12 w-full max-w-56 items-center rounded-lg border border-hairline bg-canvas">
              <button
                type="button"
                aria-label="Giảm 5 phút"
                disabled={disabled || minutes <= DURATION_MIN}
                onClick={() => onChange({ durationMinutes: clampMinutes(minutes - STEP) })}
                className="grid size-11 place-items-center text-body hover:text-brand disabled:opacity-40"
              >
                <MinusIcon className="size-4" />
              </button>
              <InputNumber
                id="room-duration"
                variant="borderless"
                controls={false}
                min={DURATION_MIN}
                max={DURATION_MAX}
                precision={0}
                value={minutes}
                disabled={disabled}
                onChange={(value) => onChange({ durationMinutes: typeof value === "number" ? value : Number.NaN })}
                className="!w-16 [&_input]:!text-center [&_input]:!text-[16px] [&_input]:!text-ink"
              />
              <button
                type="button"
                aria-label="Tăng 5 phút"
                disabled={disabled || minutes >= DURATION_MAX}
                onClick={() => onChange({ durationMinutes: clampMinutes((Number.isFinite(minutes) ? minutes : 0) + STEP) })}
                className="grid size-11 place-items-center text-body hover:text-brand disabled:opacity-40"
              >
                <PlusIcon className="size-4" />
              </button>
              <span className="pl-1 pr-4 text-sm text-ink">phút</span>
            </div>
            <FieldError id="room-duration-error" message={errors.durationMinutes} />
          </div>

          <div>
            <FieldLabel htmlFor="room-attempts" icon={<ChartBarIcon className="text-muted-foreground" />}>Số lần tham gia</FieldLabel>
            <Select
              id="room-attempts"
              value={draft.maxAttempts}
              disabled={disabled}
              onChange={(maxAttempts: number) => onChange({ maxAttempts })}
              options={ATTEMPT_OPTIONS.map((n) => ({ value: n, label: `${n} lần` }))}
              className="!h-12 w-full [&_.ant-select-selection-item]:!text-[16px]"
            />
          </div>
        </div>

        <div className="space-y-5 border-hairline-soft lg:border-l lg:pl-6">
          <div>
            <p className="mb-2.5 text-sm font-medium text-ink">Chế độ làm bài</p>
            <Radio.Group
              value={draft.questionMode}
              disabled={disabled}
              onChange={(e) => onChange({ questionMode: e.target.value, questionCount: e.target.value === "count" ? draft.questionCount : null })}
              className="flex flex-wrap items-center gap-x-6 gap-y-2"
            >
              <Radio value="all" className="!text-sm !text-ink">Làm toàn bộ đề</Radio>
              <span className="inline-flex items-center gap-1.5">
                <Radio value="count" className="!mr-0 !text-sm !text-ink">Làm theo số câu</Radio>
                <Tooltip title="Mỗi thí sinh nhận ngẫu nhiên số câu bạn nhập từ bộ đề.">
                  <button type="button" aria-label="Giải thích chế độ làm theo số câu" className="grid size-8 place-items-center text-muted-foreground hover:text-ink">
                    <InfoIcon className="size-4" />
                  </button>
                </Tooltip>
              </span>
            </Radio.Group>
            {draft.questionMode === "count" && (
              <div className="mt-3 flex items-center gap-2.5">
                <InputNumber
                  aria-label="Số câu mỗi thí sinh làm"
                  min={1}
                  max={questionTotal}
                  precision={0}
                  value={draft.questionCount ?? undefined}
                  disabled={disabled}
                  onChange={(value) => onChange({ questionCount: typeof value === "number" ? value : null })}
                  className="!h-11 !w-28 [&_input]:!h-11 [&_input]:!text-[16px]"
                />
                <span className="text-sm text-body">câu{questionTotal ? ` / ${questionTotal} câu của bộ đề` : ""}</span>
              </div>
            )}
            <FieldError id="room-question-count-error" message={errors.questionCount} />
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <span id="room-show-results" className="min-w-36 text-sm font-medium text-ink">Hiển thị kết quả</span>
            <label className="inline-flex min-h-11 cursor-pointer items-center gap-3 text-sm text-ink">
              <Switch
                aria-labelledby="room-show-results"
                checked={draft.showAnswersAfterSubmit}
                disabled={disabled}
                onChange={(showAnswersAfterSubmit) => onChange({ showAnswersAfterSubmit })}
              />
              {draft.showAnswersAfterSubmit ? "Sau khi nộp bài" : "Không hiển thị"}
            </label>
          </div>
        </div>
      </div>
    </CreateSection>
  );
});
ExamConfigSection.displayName = "ExamConfigSection";

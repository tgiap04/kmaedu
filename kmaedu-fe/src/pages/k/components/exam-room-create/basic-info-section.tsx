import { forwardRef } from "react";
import { Input } from "antd";
import { FileTextIcon, IdentificationCardIcon } from "@phosphor-icons/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/antd/select";
import { DESCRIPTION_MAX, TITLE_MAX, type CreateRoomDraft, type DraftErrors } from "@/lib/exam-room/create-room-draft";
import { cn } from "@/lib/utils";
import { CreateSection, FieldError, FieldLabel } from "./create-section";

export interface QuizSetChoice {
  id: string;
  title: string;
  questionCount?: number;
}

interface Props {
  draft: CreateRoomDraft;
  errors: DraftErrors;
  quizSets: QuizSetChoice[];
  loadingQuizSets: boolean;
  disabled: boolean;
  onChange: (patch: Partial<CreateRoomDraft>) => void;
}

const field =
  "!rounded-lg !border-hairline !bg-canvas !text-[16px] !text-ink placeholder:!text-muted-foreground hover:!border-brand/50 focus-within:!border-brand focus-within:!shadow-[0_0_0_3px_rgba(238,47,43,0.12)]";

/** Step 1: the room's name, its quiz set and an optional description. */
export const BasicInfoSection = forwardRef<HTMLElement, Props>(({ draft, errors, quizSets, loadingQuizSets, disabled, onChange }, ref) => (
  <CreateSection ref={ref} id="room-basic" icon={<IdentificationCardIcon weight="duotone" />} title="Thông tin cơ bản" subtitle="Đặt tên phòng thi và chọn bộ đề cho kỳ thi">
    <div className="grid gap-x-6 gap-y-4 lg:grid-cols-2">
      <div>
        <FieldLabel htmlFor="room-title" required>Tên phòng thi</FieldLabel>
        <Input
          id="room-title"
          value={draft.title}
          maxLength={TITLE_MAX}
          disabled={disabled}
          placeholder="Nhập tên phòng thi..."
          status={errors.title ? "error" : undefined}
          aria-invalid={!!errors.title}
          aria-describedby={errors.title ? "room-title-error" : undefined}
          onChange={(e) => onChange({ title: e.target.value })}
          suffix={<span className="text-xs tabular-nums text-muted-foreground">{draft.title.length}/{TITLE_MAX}</span>}
          className={cn(field, "!h-12 !px-3.5", errors.title && "!border-red-500")}
        />
        <FieldError id="room-title-error" message={errors.title} />
      </div>

      <div>
        <FieldLabel htmlFor="room-quiz-set" required>Bộ đề</FieldLabel>
        <Select
          value={draft.quizSetId || undefined}
          onValueChange={(quizSetId) => onChange({ quizSetId })}
          disabled={disabled || loadingQuizSets}
          placeholder={loadingQuizSets ? "Đang tải bộ đề..." : "Chọn bộ đề"}
          prefix={<FileTextIcon className="mr-1 size-5 text-brand" aria-hidden />}
          status={errors.quizSetId ? "error" : undefined}
          className="create-room-select !h-12 w-full"
          id="room-quiz-set"
          notFoundContent={<span className="text-sm text-muted-foreground">Bạn chưa có bộ đề nào</span>}
        >
          <SelectTrigger><SelectValue placeholder="Chọn bộ đề" /></SelectTrigger>
          <SelectContent>
            {quizSets.map((set) => (
              <SelectItem key={set.id} value={set.id}>
                {set.title}
                {set.questionCount ? ` · ${set.questionCount} câu` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldError id="room-quiz-set-error" message={errors.quizSetId} />
      </div>

      <div className="lg:col-span-2">
        <FieldLabel htmlFor="room-description">Mô tả (tuỳ chọn)</FieldLabel>
        <div className="relative">
          <Input.TextArea
            id="room-description"
            value={draft.description}
            maxLength={DESCRIPTION_MAX}
            disabled={disabled}
            placeholder="Nhập mô tả cho phòng thi (nếu có)..."
            autoSize={{ minRows: 3, maxRows: 6 }}
            status={errors.description ? "error" : undefined}
            onChange={(e) => onChange({ description: e.target.value })}
            className={cn(field, "!px-3.5 !py-3 !pb-7", errors.description && "!border-red-500")}
          />
          <span className="pointer-events-none absolute bottom-2.5 right-3.5 text-xs tabular-nums text-muted-foreground">
            {draft.description.length}/{DESCRIPTION_MAX}
          </span>
        </div>
        <FieldError id="room-description-error" message={errors.description} />
      </div>
    </div>
  </CreateSection>
));
BasicInfoSection.displayName = "BasicInfoSection";

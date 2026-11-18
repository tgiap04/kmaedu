import { GearSixIcon } from "@phosphor-icons/react";
import { Switch } from "@/components/antd/switch";
import { TITLE_MAX } from "@/lib/manage-exam/create-exam-draft";
import { cn } from "@/lib/utils";
import { createCardClass } from "./create-exam-ui";

interface Props {
  title: string;
  titleError?: string;
  onTitleChange: (v: string) => void;
  shuffle: boolean;
  onShuffleChange: (v: boolean) => void;
}

const fieldLabel = "block text-[15px] font-medium text-ink";
const hint = "mt-1.5 text-[13px] text-body";

/** "Tùy chỉnh đề thi": the exam's name and question order. */
export function ExamCustomizeCard(p: Props) {
  return (
    <section className={cn(createCardClass, "p-4 md:p-5")} aria-labelledby="customize-title">
      <div className="flex items-start gap-3 border-b border-hairline-soft pb-4">
        <GearSixIcon className="mt-0.5 size-5 text-brand" aria-hidden />
        <div>
          <h2 id="customize-title" className="text-base font-bold text-ink">Tùy chỉnh đề thi</h2>
          <p className="mt-0.5 text-[13px] text-body">Điều chỉnh các thiết lập theo nhu cầu của bạn</p>
        </div>
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-2 md:gap-0 md:divide-x md:divide-hairline-soft">
        <div className="md:pr-8">
          <label htmlFor="exam-title" className={fieldLabel}>Tên đề thi</label>
          <input
            id="exam-title"
            value={p.title}
            maxLength={TITLE_MAX + 1}
            placeholder="VD: Đề kiểm tra giữa kỳ Hệ điều hành"
            onChange={(e) => p.onTitleChange(e.target.value)}
            aria-invalid={!!p.titleError}
            className="mt-2 h-11 w-full rounded-lg border border-hairline bg-canvas px-4 text-[15px] text-ink outline-none placeholder:text-muted-soft focus:border-brand-border focus:ring-2 focus:ring-brand/20"
          />
          {p.titleError && <p className="mt-1.5 text-[13px] text-destructive">{p.titleError}</p>}
        </div>

        <div className="space-y-5 md:pl-8">
          <div>
            <div className="flex items-center gap-4">
              <span id="shuffle-label" className={fieldLabel}>Xáo trộn câu hỏi</span>
              <Switch checked={p.shuffle} onCheckedChange={p.onShuffleChange} aria-labelledby="shuffle-label" />
            </div>
            <p className={hint}>Xáo trộn thứ tự câu trong từng chương, thứ tự chương giữ nguyên.</p>
          </div>
        </div>
      </div>
    </section>
  );
}

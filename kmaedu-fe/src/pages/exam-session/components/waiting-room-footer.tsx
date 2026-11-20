import { InfoIcon, PlayIcon } from "@phosphor-icons/react";
import { Checkbox } from "@/components/antd/checkbox";
import { cn } from "@/lib/utils";

interface Props {
  note: string;
  /** Candidate only: the honour pledge that unlocks the start button. Hidden for the host. */
  pledge?: { checked: boolean; onChange: (checked: boolean) => void };
  canStart: boolean;
  disabledReason?: string;
  onStart: () => void;
}

/** Bar pinned to the bottom of the page: what happens when time runs out, and the start button. */
export function WaitingRoomFooter({ note, pledge, canStart, disabledReason, onStart }: Props) {
  return (
    <div className="sticky bottom-0 z-20 mt-6 border-t border-hairline bg-canvas/95 backdrop-blur">
      <div className="flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 xl:px-6 2xl:px-8">
        <p className="flex items-center gap-2 text-sm text-body">
          <InfoIcon className="size-5 shrink-0" aria-hidden />
          {note}
        </p>
        <div className="flex w-full flex-wrap items-center gap-4 sm:w-auto">
          {pledge && (
            <label htmlFor="exam-pledge" className="flex max-w-md cursor-pointer items-center gap-2 text-sm text-ink">
              <Checkbox id="exam-pledge" checked={pledge.checked} onCheckedChange={(v) => pledge.onChange(v === true)} />
              Tôi đã đọc quy định và cam kết không gian lận
            </label>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            title={!canStart ? disabledReason : undefined}
            className={cn(
              "inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-brand px-6 sm:w-auto text-sm font-semibold text-white transition-colors",
              "hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:cursor-not-allowed disabled:bg-brand/30",
            )}
          >
            <PlayIcon weight="fill" className="size-4" aria-hidden />
            Bắt đầu làm bài
          </button>
        </div>
      </div>
    </div>
  );
}

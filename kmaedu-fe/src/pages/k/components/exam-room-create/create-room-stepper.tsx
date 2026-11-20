import { Fragment } from "react";
import { cn } from "@/lib/utils";

export const CREATE_STEPS = ["Thông tin cơ bản", "Cấu hình bài thi", "Cài đặt nâng cao", "Xem lại & Tạo phòng"] as const;

interface Props {
  /** 0-based index of the step in view. */
  active: number;
  onSelect: (index: number) => void;
}

/** The four numbered steps of the design: the active one in brand red with an underline, a hairline between steps. */
export function CreateRoomStepper({ active, onSelect }: Props) {
  return (
    <nav aria-label="Các bước tạo phòng thi" className="overflow-x-auto px-1">
      <ol className="flex min-w-max items-center gap-3 sm:min-w-0">
        {CREATE_STEPS.map((label, index) => {
          const current = index === active;
          return (
            <Fragment key={label}>
              {index > 0 && <li aria-hidden className="hidden h-px min-w-6 flex-1 bg-hairline sm:block" />}
              <li className="shrink-0">
                <button
                  type="button"
                  onClick={() => onSelect(index)}
                  aria-current={current ? "step" : undefined}
                  className={cn(
                    "relative flex min-h-11 items-center gap-2.5 px-2 text-sm transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
                    current ? "font-semibold text-brand" : "text-body hover:text-ink",
                  )}
                >
                  <span
                    className={cn(
                      "grid size-7 place-items-center rounded-full border text-[13px] font-semibold",
                      current ? "border-brand bg-brand text-white" : "border-hairline bg-canvas text-body",
                    )}
                  >
                    {index + 1}
                  </span>
                  <span className={cn(!current && "hidden md:inline")}>{label}</span>
                  {current && <span aria-hidden className="absolute inset-x-0 -bottom-1 h-0.5 rounded-full bg-brand" />}
                </button>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

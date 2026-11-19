import { useState } from "react";
import { LightbulbIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { panelClass } from "./create-flashcard-ui";

const STORAGE_KEY = "kmaedu:tip:create-flashcard:v1";

const wasDismissed = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
};

/** "Mẹo nhỏ" strip; closing it is remembered in this browser. */
export function TipsBanner({ text }: { text: string }) {
  const [open, setOpen] = useState(() => !wasDismissed());
  if (!open) return null;

  const close = () => {
    setOpen(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // storage blocked: the tip simply shows again next time
    }
  };

  return (
    <aside aria-label="Mẹo nhỏ" className={cn(panelClass, "flex items-start gap-3 p-3.5 md:px-4")}>
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#fff6e0] text-[#f5a524]">
        <LightbulbIcon className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[14px] font-semibold text-ink">Mẹo nhỏ</p>
        <p className="mt-0.5 text-[13px] text-body">{text}</p>
      </div>
      <button type="button" onClick={close} aria-label="Đóng mẹo nhỏ" className="grid size-8 shrink-0 place-items-center rounded-lg text-body hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
        <XIcon className="size-4" aria-hidden />
      </button>
    </aside>
  );
}

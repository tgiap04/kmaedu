import type { ReactNode } from "react";

/** A key cap for keyboard hints ("Space", "←"). */
export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="grid h-7 min-w-7 place-items-center rounded-md border border-hairline bg-canvas px-1.5 font-sans text-xs font-semibold text-ink shadow-[0_1px_0_var(--hairline)]">
      {children}
    </kbd>
  );
}

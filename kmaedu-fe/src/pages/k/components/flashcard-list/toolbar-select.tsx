import type { ReactNode } from "react";
import { CaretDownIcon, CheckIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { cn } from "@/lib/utils";

interface Option {
  value: string;
  label: string;
}

interface Props {
  icon: ReactNode;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name of the control, e.g. "Sắp xếp". */
  label: string;
  className?: string;
}

/** White pill with a leading icon that opens the app dropdown; the current option carries a tick. */
export function ToolbarSelect({ icon, options, value, onChange, label, className }: Props) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${current?.label ?? ""}`}
          className={cn(
            "inline-flex h-9 items-center gap-2 rounded-lg border border-hairline bg-canvas pl-3 pr-2.5 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 [&>svg]:size-4 [&>svg]:shrink-0",
            className,
          )}
        >
          {icon}
          <span className="truncate">{current?.label}</span>
          <CaretDownIcon className="size-3.5 text-muted-foreground" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => o.value !== value && onChange(o.value)} className="cursor-pointer">
            <CheckIcon weight="bold" className={cn("mr-2 size-4 shrink-0", o.value === value ? "text-brand" : "invisible")} aria-hidden />
            {o.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

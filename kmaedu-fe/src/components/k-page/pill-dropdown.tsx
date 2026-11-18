import { CheckCircleIcon, CaretCircleDownIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { cn } from "@/lib/utils";

export interface PillOption {
  value: string;
  label: string;
  /** Optional dot colour shown before the label. */
  color?: string | null;
}

interface Props {
  options: PillOption[];
  value: string;
  onChange: (value: string) => void;
  /** Accessible name, e.g. "Chương của câu 3". */
  label: string;
  placeholder?: string;
  className?: string;
}

/** Pill trigger with the app dropdown (never the browser's native select); the current option carries a ✓. */
export function PillDropdown({ options, value, onChange, label, placeholder = "Chọn", className }: Props) {
  const current = options.find((o) => o.value === value);
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`${label}: ${current?.label ?? placeholder}`}
          className={cn(
            "inline-flex h-8 w-32 shrink-0 items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft pl-3 pr-2 text-[13px] font-medium text-brand transition-colors hover:bg-brand-soft-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:w-44",
            className,
          )}
        >
          {current?.color && <span className="size-2 shrink-0 rounded-full" style={{ backgroundColor: current.color }} aria-hidden />}
          <span className="min-w-0 flex-1 truncate text-left">{current?.label ?? placeholder}</span>
          <CaretCircleDownIcon className="size-4 shrink-0" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {options.map((o) => (
          <DropdownMenuItem key={o.value} onClick={() => o.value !== value && onChange(o.value)} className="cursor-pointer">
            <CheckCircleIcon className={cn("mr-2 size-4 shrink-0", o.value === value ? "text-brand" : "invisible")} aria-hidden />
            {o.color && <span className="mr-2 size-2 shrink-0 rounded-full" style={{ backgroundColor: o.color }} aria-hidden />}
            <span className="max-w-64 truncate">{o.label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

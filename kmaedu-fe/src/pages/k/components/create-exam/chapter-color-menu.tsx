import { CheckIcon, PaletteIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { CHAPTER_COLORS } from "@/lib/manage-exam/chapter-colors";
import { cn } from "@/lib/utils";

interface Props {
  /** Chapter name, for the button's accessible label. */
  name: string;
  value: string;
  onChange: (color: string) => void;
  className?: string;
}

/** Palette button that opens the app dropdown with the chapter colours (dot, name, ✓ on the current one). */
export function ChapterColorMenu({ name, value, onChange, className }: Props) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" aria-label={`Đổi màu ${name}`} title="Đổi màu chương" className={className}>
          <PaletteIcon className="size-3.5" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        {CHAPTER_COLORS.map((c) => (
          <DropdownMenuItem key={c.value} onClick={() => c.value !== value && onChange(c.value)} className="cursor-pointer">
            <span className="size-3.5 shrink-0 rounded-full ring-1 ring-black/5" style={{ backgroundColor: c.value }} aria-hidden />
            <span className="min-w-20">{c.name}</span>
            <CheckIcon className={cn("size-4 shrink-0", c.value.toLowerCase() === value.toLowerCase() ? "text-brand" : "invisible")} aria-hidden />
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

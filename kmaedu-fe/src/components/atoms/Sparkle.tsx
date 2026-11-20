import { cn } from "@/lib/utils";

/** Four-point sparkle used as quiet decoration; position and size come from `className`. */
export function Sparkle({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden className={cn("pointer-events-none absolute fill-brand/25", className)}>
      <path d="M12 0c.9 6.6 5.4 11.1 12 12-6.6.9-11.1 5.4-12 12-.9-6.6-5.4-11.1-12-12C6.6 11.1 11.1 6.6 12 0Z" />
    </svg>
  );
}

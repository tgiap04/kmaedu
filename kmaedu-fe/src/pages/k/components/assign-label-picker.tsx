import { useEffect, useRef, useState } from "react";
import { Popover } from "antd";
import { CircleNotchIcon, PlusIcon } from "@phosphor-icons/react";
import { LABEL_NAME_MAX, filterLabels, resolveSubmit } from "@/lib/label-picker/label-picker";
import { cn } from "@/lib/utils";

export interface PickableLabel {
  id: string;
  name: string;
  color?: string | null;
}

interface Props {
  /** The set's labels, in the order to list them. */
  labels: PickableLabel[];
  /** What the page calls a label: "nhãn" (flashcards) or "chương" (quiz). */
  noun: string;
  disabled?: boolean;
  /** The label list could not be read: say so instead of "no label yet". */
  unavailable?: boolean;
  /** Puts the row in this label; true when it saved (the caller tells the user either way). */
  onAssign: (labelId: string) => Promise<boolean>;
  /** Creates a label with this name, then puts the row in it. */
  onCreate: (name: string) => Promise<boolean>;
}

const NEW = "__new__";
const option = "flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-[13px] transition-colors disabled:pointer-events-none";

/**
 * "+ Gán nhãn" on a row without a label. One box both filters the set's labels and names a new one:
 * Enter takes the label already called that (case ignored), otherwise creates it.
 */
export function AssignLabelPicker({ labels, noun, disabled, unavailable, onAssign, onCreate }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLInputElement>(null);
  const shown = filterLabels(labels, query);
  const submit = resolveSubmit(labels, query);
  const newName = submit?.kind === "create" ? submit.name : null;

  // The popup is rendered into a portal that joins the page after React commits, so `autoFocus` would focus a
  // detached input and do nothing: focus the box once the popup is on the page.
  useEffect(() => {
    if (!open || disabled) return;
    const frame = requestAnimationFrame(() => box.current?.focus());
    return () => cancelAnimationFrame(frame);
  }, [open, disabled]);

  // Another row started editing: close instead of coming back later with an old search.
  useEffect(() => {
    if (!disabled) return;
    setOpen(false);
    setQuery("");
  }, [disabled]);

  const toggle = (next: boolean) => {
    if (pending) return; // a save in flight keeps the list open
    setOpen(next);
    if (!next) setQuery("");
  };

  const run = async (key: string, work: () => Promise<boolean>) => {
    if (pending) return;
    setPending(key);
    const ok = await work();
    setPending(null);
    if (ok) {
      setOpen(false);
      setQuery("");
    }
  };
  const assign = (id: string) => run(id, () => onAssign(id));
  const create = (name: string) => run(NEW, () => onCreate(name));

  const content = (
    <div
      role="dialog"
      aria-label={`Gán ${noun}`}
      className="w-64"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || pending) return;
        toggle(false);
        trigger.current?.focus();
      }}
    >
      <div className="border-b border-hairline-soft p-2">
        <input
          ref={box}
          value={query}
          maxLength={LABEL_NAME_MAX}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            // Enter that ends a Telex / VNI composition only commits the letter.
            if (e.key !== "Enter" || e.nativeEvent.isComposing) return;
            e.preventDefault();
            if (submit?.kind === "assign") void assign(submit.label.id);
            else if (submit) void create(submit.name);
          }}
          placeholder={`Tìm hoặc tạo ${noun} mới…`}
          aria-label={`Tìm hoặc tạo ${noun}`}
          className="h-8 w-full rounded-md border border-hairline bg-canvas px-2.5 text-[13px] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand-border"
        />
      </div>

      {shown.length > 0 && (
        <ul className="max-h-56 overflow-y-auto p-1">
          {shown.map((l) => (
            <li key={l.id}>
              <button type="button" onClick={() => void assign(l.id)} disabled={pending !== null} aria-busy={pending === l.id} className={cn(option, "text-ink hover:bg-surface-soft", pending && pending !== l.id && "opacity-50")}>
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color ?? "var(--muted-foreground)" }} aria-hidden />
                <span className="min-w-0 flex-1 truncate">{l.name}</span>
                {pending === l.id && <CircleNotchIcon className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      )}

      {labels.length === 0 && !submit && (
        <p className="px-3 py-3 text-[13px] text-muted-foreground">
          {unavailable ? `Không tải được danh sách ${noun}. Gõ tên để tạo ${noun} mới (tên đã có sẽ bị từ chối).` : `Chưa có ${noun} nào. Gõ tên để tạo ${noun} đầu tiên.`}
        </p>
      )}

      {newName && (
        <div className={cn("p-1", shown.length > 0 && "border-t border-hairline-soft")}>
          <button type="button" onClick={() => void create(newName)} disabled={pending !== null} aria-busy={pending === NEW} className={cn(option, "font-medium text-brand hover:bg-brand-soft", pending && pending !== NEW && "opacity-50")}>
            {pending === NEW ? <CircleNotchIcon className="size-3.5 shrink-0 animate-spin" aria-hidden /> : <PlusIcon className="size-3.5 shrink-0" aria-hidden />}
            <span className="min-w-0 flex-1 truncate">Tạo {noun} “{newName}”</span>
          </button>
        </div>
      )}
    </div>
  );

  return (
    <Popover open={open && !disabled} onOpenChange={toggle} trigger="click" placement="bottomLeft" arrow={false} destroyOnHidden content={content} styles={{ container: { padding: 0 } }}>
      <button
        ref={trigger}
        type="button"
        disabled={disabled}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="inline-flex h-7 items-center gap-1 rounded-lg border border-dashed border-hairline px-2.5 text-[12px] font-medium text-muted-foreground transition-colors hover:border-brand-border hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50"
      >
        <PlusIcon className="size-3.5" aria-hidden />
        Gán {noun}
      </button>
    </Popover>
  );
}

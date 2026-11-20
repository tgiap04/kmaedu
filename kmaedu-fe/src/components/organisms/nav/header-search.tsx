import { type FormEvent, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MagnifyingGlassIcon } from "@phosphor-icons/react";

/** Page a search lands on: guessed from a keyword, else "Tài liệu của tôi" filtered by the query. */
export function searchTarget(raw: string): string {
  const query = raw.trim();
  if (!query) return "/k/my-materials";
  const q = encodeURIComponent(query);
  const normalized = query.toLowerCase();
  if (normalized.includes("flash")) return `/k/flash-card?search=${q}`;
  if (normalized.includes("phòng") || normalized.includes("room")) return `/k/manage-exam-room?search=${q}`;
  if (normalized.includes("đề") || normalized.includes("thi") || normalized.includes("exam")) return `/k/manage-exam?search=${q}`;
  return `/k/my-materials?search=${q}`;
}

/** The workspace search of the dashboard headers. ⌘K / Ctrl+K (or the sidebar's "Tìm nhanh") focuses it. */
export function HeaderSearch() {
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }
    };
    const onFocusSearch = () => inputRef.current?.focus();
    window.addEventListener("keydown", onKey);
    window.addEventListener("kmaedu:focus-search", onFocusSearch);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("kmaedu:focus-search", onFocusSearch);
    };
  }, []);

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate(searchTarget(query));
  };

  return (
    <form
      onSubmit={submit}
      className="hidden h-12 w-full max-w-md items-center gap-3 rounded-lg border border-hairline bg-canvas px-4 text-[15px] text-muted-foreground shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-colors focus-within:border-brand-border focus-within:ring-4 focus-within:ring-coral/10 lg:flex xl:max-w-lg"
    >
      <MagnifyingGlassIcon className="h-5 w-5 shrink-0 text-body" />
      <input
        ref={inputRef}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        className="min-w-0 flex-1 bg-transparent text-body outline-none placeholder:text-muted-foreground"
        placeholder="Tìm kiếm tài liệu, đề thi, flashcard..."
        aria-label="Tìm kiếm trong workspace"
      />
      <kbd className="hidden shrink-0 rounded-lg bg-surface-card px-2 py-1 font-sans text-[12px] font-semibold text-body xl:inline">⌘K</kbd>
    </form>
  );
}

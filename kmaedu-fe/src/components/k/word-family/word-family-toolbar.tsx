import { Button } from "antd";
import { GraphIcon, ListIcon, FloppyDiskIcon, LightningIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

interface WordFamilyToolbarProps {
  viewMode: "tree" | "list";
  onViewModeChange: (mode: "tree" | "list") => void;
  canGenerate: boolean;
  canSave: boolean;
  canToFlashcard: boolean;
  generating: boolean;
  isSaved: boolean;
  selectedCount: number;
  onGenerate: () => void;
  onSave: () => void;
  onCreateFlashcard: () => void;
}

const toggleClass = (active: boolean) =>
  cn(
    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
    active ? "bg-canvas text-brand shadow-sm" : "text-body hover:text-ink",
  );

/** View toggle plus the generate / save / flashcard actions of the word-family detail page. */
export function WordFamilyToolbar(p: WordFamilyToolbarProps) {
  return (
    <>
      <div className="flex rounded-lg border border-hairline bg-surface-soft p-0.5">
        <button type="button" onClick={() => p.onViewModeChange("tree")} className={toggleClass(p.viewMode === "tree")}>
          <GraphIcon className="size-3.5" aria-hidden />
          Tree
        </button>
        <button type="button" onClick={() => p.onViewModeChange("list")} className={toggleClass(p.viewMode === "list")}>
          <ListIcon className="size-3.5" aria-hidden />
          List
        </button>
      </div>

      {p.canGenerate && (
        <Button icon={<LightningIcon className="size-3.5" />} onClick={p.onGenerate} loading={p.generating}>
          {p.generating ? "Đang sinh..." : "Sinh lại từ con"}
        </Button>
      )}

      {p.canSave && (
        <Button icon={<FloppyDiskIcon className="size-3.5" />} onClick={p.onSave} disabled={p.isSaved || p.generating}>
          {p.isSaved ? "Đã lưu" : "Lưu"}
        </Button>
      )}

      {p.canToFlashcard && p.viewMode === "list" && p.selectedCount > 0 && (
        <Button type="primary" onClick={p.onCreateFlashcard}>
          Tạo Flashcard ({p.selectedCount})
        </Button>
      )}
    </>
  );
}

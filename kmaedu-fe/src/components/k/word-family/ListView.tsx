import { Checkbox } from "antd";
import type { WordFamilyWord } from "@/types/wordFamily";
import { CaretCircleDownIcon, CaretCircleRightIcon } from "@phosphor-icons/react";

interface ListViewProps {
  words: WordFamilyWord[];
  selectedIndices: Set<number>;
  expandedWords: Set<number>;
  onToggleSelect: (idx: number) => void;
  onToggleExpand: (idx: number) => void;
  onSelectAll: () => void;
  allSelected: boolean;
}

/**
 * List view with checkboxes for word selection and expandable details.
 */
export function ListView({
  words,
  selectedIndices,
  expandedWords,
  onToggleSelect,
  onToggleExpand,
  onSelectAll,
  allSelected,
}: ListViewProps) {
  return (
    <div>
      {/* Select all header */}
      <div className="flex items-center gap-3 border-b border-hairline-soft bg-surface-soft px-4 py-2.5 md:px-5">
        <Checkbox checked={allSelected} onChange={onSelectAll} />
        <span className="text-xs font-medium text-muted-foreground">
          {selectedIndices.size}/{words.length} đã chọn
        </span>
      </div>

      {/* Word rows */}
      <div className="divide-y divide-hairline-soft">
        {words.map((word, idx) => (
          <div key={idx} className="px-4 py-2.5 transition-colors hover:bg-surface-soft/50 md:px-5">
            <div className="flex items-center gap-3">
              <Checkbox
                checked={selectedIndices.has(idx)}
                onChange={() => onToggleSelect(idx)}
              />
              <button
                type="button"
                onClick={() => onToggleExpand(idx)}
                className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg text-left text-[14px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
              >
                {expandedWords.has(idx) ? (
                  <CaretCircleDownIcon size={14} className="text-muted-foreground" />
                ) : (
                  <CaretCircleRightIcon size={14} className="text-muted-foreground" />
                )}
                <span className="font-semibold text-ink">{word.word}</span>
                {word.pos && (
                  <span className="rounded-lg bg-brand-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-brand">
                    {word.pos}
                  </span>
                )}
              </button>
            </div>

            {expandedWords.has(idx) && (
              <div className="ml-9 mt-1.5 space-y-2 rounded-lg border border-hairline-soft bg-surface-soft px-3.5 py-3 text-[13px] leading-relaxed">
                <p className="flex gap-2">
                  <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Nghĩa
                  </span>
                  <span className="text-body">{word.meaningVi}</span>
                </p>
                {word.meaningEn && (
                  <p className="flex gap-2">
                    <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      EN
                    </span>
                    <span className="text-body">{word.meaningEn}</span>
                  </p>
                )}
                {word.example && (
                  <p className="border-l-2 border-brand-border pl-2.5 italic text-muted-foreground">
                    "{word.example}"
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

import { useState } from "react";
import { XIcon } from "@phosphor-icons/react";
import { DESCRIPTION_MAX, TAG_LENGTH_MAX, TAG_MAX, addTag } from "./flashcard-create-logic";
import { fieldLabelClass, inputClass } from "./create-flashcard-ui";

interface Props {
  description: string;
  onDescriptionChange: (v: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled: boolean;
}

/** "Nhập thủ công": a description and tags; the name and visibility are in the settings block. */
export function ManualSourcePanel({ description, onDescriptionChange, tags, onTagsChange, disabled }: Props) {
  const [tagText, setTagText] = useState("");
  const commitTag = () => {
    onTagsChange(addTag(tags, tagText));
    setTagText("");
  };

  return (
    <div className="space-y-5">
      <p className="rounded-lg bg-surface-soft px-3.5 py-2.5 text-[13px] text-ink">
        Bộ thẻ được tạo trống; sau khi tạo, bạn thêm từng thẻ ở trang chi tiết bộ thẻ.
      </p>
      <div>
        <label htmlFor="flashcard-description" className={fieldLabelClass}>Mô tả</label>
        <textarea
          id="flashcard-description"
          value={description}
          maxLength={DESCRIPTION_MAX}
          rows={4}
          disabled={disabled}
          placeholder="Bộ thẻ này nói về điều gì?"
          onChange={(e) => onDescriptionChange(e.target.value)}
          className={`${inputClass} mt-2 h-auto resize-y py-2.5`}
        />
        <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{description.length}/{DESCRIPTION_MAX}</p>
      </div>
      <div>
        <label htmlFor="flashcard-tag" className={fieldLabelClass}>Thẻ phân loại</label>
        <input
          id="flashcard-tag"
          value={tagText}
          maxLength={TAG_LENGTH_MAX}
          disabled={disabled || tags.length >= TAG_MAX}
          placeholder={tags.length >= TAG_MAX ? `Tối đa ${TAG_MAX} thẻ phân loại` : "Nhập rồi nhấn Enter, ví dụ: Tiếng Anh"}
          onChange={(e) => setTagText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              commitTag();
            }
          }}
          onBlur={() => tagText.trim() && commitTag()}
          className={`${inputClass} mt-2`}
        />
        {tags.length > 0 && (
          <ul className="mt-2 flex flex-wrap gap-2">
            {tags.map((tag) => (
              <li key={tag} className="inline-flex items-center gap-1 rounded-lg border border-brand-border bg-brand-soft py-1 pl-2.5 pr-1 text-[13px] font-medium text-brand-strong">
                {tag}
                <button type="button" aria-label={`Bỏ thẻ ${tag}`} disabled={disabled} onClick={() => onTagsChange(tags.filter((t) => t !== tag))} className="grid size-5 place-items-center rounded-md hover:bg-brand/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
                  <XIcon className="size-3" weight="bold" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

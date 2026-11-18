/** Colours a chapter (label) can take; the same palette the label API has always stored. */
export const CHAPTER_COLORS: { value: string; name: string }[] = [
  { value: "#EF4444", name: "Đỏ" },
  { value: "#F59E0B", name: "Cam" },
  { value: "#10B981", name: "Xanh lá" },
  { value: "#06B6D4", name: "Xanh ngọc" },
  { value: "#3B82F6", name: "Xanh dương" },
  { value: "#8B5CF6", name: "Tím" },
  { value: "#EC4899", name: "Hồng" },
  { value: "#64748B", name: "Xám" },
];

/** The label API accepts only #rrggbb. */
export const isChapterColor = (value: string) => /^#[0-9a-f]{6}$/i.test(value);

/** Palette colour for the n-th chapter, wrapping around. */
export const chapterColorAt = (n: number) => CHAPTER_COLORS[((n % CHAPTER_COLORS.length) + CHAPTER_COLORS.length) % CHAPTER_COLORS.length].value;

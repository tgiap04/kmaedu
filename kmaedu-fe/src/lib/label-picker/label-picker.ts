import { fold } from "@/lib/manage-exam/exam-question-picker";

/** Longest label name the label APIs accept. */
export const LABEL_NAME_MAX = 100;

/** Labels in their set order; older labels all kept order 0, so creation time breaks the tie. */
export function orderLabels<T extends { order: number; createdAt: string }>(labels: T[]): T[] {
  return [...labels].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

/** Labels whose name contains the typed words, case and accents ignored. */
export function filterLabels<T extends { name: string }>(labels: T[], query: string): T[] {
  const needle = fold(query.trim());
  return needle ? labels.filter((l) => fold(l.name).includes(needle)) : labels;
}

const sameName = (name: string) => name.trim().normalize("NFC").toLocaleLowerCase("vi");

/**
 * The label already named what was typed (case ignored). Accents count: "Ca" and "Cá" are two words,
 * so typing one never picks the other.
 */
export function findLabelByName<T extends { name: string }>(labels: T[], query: string): T | undefined {
  const typed = query.trim().normalize("NFC");
  if (!typed) return undefined;
  // The database tells "Toán" and "toán" apart: the one written exactly that way first, then any case.
  const wanted = sameName(query);
  return labels.find((l) => l.name.trim().normalize("NFC") === typed) ?? labels.find((l) => sameName(l.name) === wanted);
}

/** A saved label: its new name and colour, or null once it is deleted. */
export interface LabelChange {
  labelId: string;
  label: { id: string; name: string; color: string | null } | null;
}

/** The set's labels after one was saved: renamed / recoloured in place, or taken out once deleted. */
export function applyLabelChange<T extends { id: string; name: string; color: string | null }>(labels: T[], change: LabelChange): T[] {
  const { labelId, label } = change;
  if (!label) return labels.filter((l) => l.id !== labelId);
  return labels.map((l) => (l.id === labelId ? { ...l, name: label.name, color: label.color } : l));
}

/** Order for a new label: after every label of the set. */
export function nextLabelOrder(labels: { order: number }[]): number {
  return Math.max(-1, ...labels.map((l) => l.order)) + 1;
}

export type PickerSubmit<T> = { kind: "assign"; label: T } | { kind: "create"; name: string } | null;

/** What Enter does in the picker: take the label already called that, else create one; nothing for a blank box. */
export function resolveSubmit<T extends { name: string }>(labels: T[], query: string): PickerSubmit<T> {
  const name = query.trim();
  if (!name) return null;
  const label = findLabelByName(labels, name);
  return label ? { kind: "assign", label } : { kind: "create", name };
}

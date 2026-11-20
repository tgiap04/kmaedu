/**
 * The card the stepper marks while scrolling: the last one whose top has reached the reading line (just under
 * the sticky stepper), or the last mounted one once the page is scrolled to the bottom (a short last card never
 * reaches the line). `tops` are viewport tops in px, null for a card that is not mounted.
 */
export function activeSectionIndex(tops: readonly (number | null)[], line: number, atBottom: boolean): number {
  let active = 0;
  tops.forEach((top, index) => {
    if (top === null) return;
    if (atBottom || top <= line) active = index;
  });
  return active;
}

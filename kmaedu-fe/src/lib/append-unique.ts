/** `prev` plus the items of `next` whose key is not there yet (a page fetched twice adds nothing). */
export function appendUnique<T>(prev: T[], next: T[], key: (item: T) => string): T[] {
  const seen = new Set(prev.map(key));
  const out = [...prev];
  for (const item of next) {
    const k = key(item);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(item);
  }
  return out;
}

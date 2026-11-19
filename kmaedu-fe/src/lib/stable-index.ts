/** A slot in [0, size) that never changes for the same key (picks a room's or set's tile icon). */
export function stableIndex(key: string, size: number): number {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0
  return Math.abs(hash) % size
}

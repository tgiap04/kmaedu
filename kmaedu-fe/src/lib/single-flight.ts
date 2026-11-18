/**
 * A runner that starts `work` only when no earlier run is still going (a double click, a second
 * submit before React re-renders). A skipped call resolves to undefined.
 */
export function singleFlight() {
  let busy = false;
  return async <T>(work: () => Promise<T>): Promise<T | undefined> => {
    if (busy) return undefined;
    busy = true;
    try {
      return await work();
    } finally {
      busy = false;
    }
  };
}

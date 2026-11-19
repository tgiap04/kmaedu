/**
 * Decides which read of a list may write its result. The newest `begin()` owns it; `invalidate()` is for a change
 * applied to the list in place (add / edit / delete): a read that was already on its way would bring the list
 * from before the change, so it is made stale, and the caller is told to read again when one was in flight.
 */
export function createReadGate() {
  let current = 0;
  let inFlight = 0;
  return {
    begin(): number {
      inFlight += 1;
      current += 1;
      return current;
    },
    /** Call when a read finished, whether it was still current or not. */
    end(_token: number): void {
      inFlight = Math.max(0, inFlight - 1);
    },
    isCurrent: (token: number): boolean => token === current,
    /** True when a read was in flight and so a new one is needed. */
    invalidate(): boolean {
      current += 1;
      return inFlight > 0;
    },
  };
}

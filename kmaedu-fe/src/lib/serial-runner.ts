/**
 * Runs `task` one at a time. A call made while it runs asks for one more run once it ends (any number of such
 * calls make a single run), so the last run always starts after the last call. Every caller's promise settles
 * when no run is left; the first failure of that stretch is passed on, queued runs still happen.
 */
export function createSerialRunner(task: () => Promise<void>): () => Promise<void> {
  let running: Promise<void> | null = null;
  let again = false;
  return () => {
    if (running) {
      again = true;
      return running;
    }
    running = (async () => {
      let failure: { error: unknown } | null = null;
      try {
        do {
          again = false;
          try {
            await task();
          } catch (error) {
            failure ??= { error };
          }
        } while (again);
      } finally {
        running = null;
      }
      if (failure) throw failure.error;
    })();
    return running;
  };
}

import { describe, expect, it } from "vitest";
import { createSerialRunner } from "./serial-runner";

const deferred = () => {
  let resolve!: () => void;
  const promise = new Promise<void>((r) => (resolve = r));
  return { promise, resolve };
};

describe("createSerialRunner", () => {
  it("never runs the task twice at once, and runs it once more for calls made meanwhile", async () => {
    const gates = [deferred(), deferred()];
    let running = 0;
    let most = 0;
    let runs = 0;
    const run = createSerialRunner(async () => {
      const gate = gates[runs++];
      running++;
      most = Math.max(most, running);
      await gate?.promise;
      running--;
    });
    const first = run();
    void run();
    void run(); // three calls while the first runs → one more run, not three
    gates[0].resolve();
    await Promise.resolve();
    gates[1].resolve();
    await first;
    expect({ runs, most }).toEqual({ runs: 2, most: 1 });
  });

  it("resolves the first caller only once the queued run is done too", async () => {
    const order: string[] = [];
    let n = 0;
    const run = createSerialRunner(async () => {
      const mine = ++n;
      await Promise.resolve();
      order.push(`run ${mine}`);
    });
    const first = run().then(() => order.push("first done"));
    void run();
    await first;
    expect(order).toEqual(["run 1", "run 2", "first done"]);
  });

  it("runs again later when called after it finished", async () => {
    let runs = 0;
    const run = createSerialRunner(async () => {
      runs++;
    });
    await run();
    await run();
    expect(runs).toBe(2);
  });

  it("keeps running queued work after a failed run, and passes the failure on", async () => {
    let runs = 0;
    const run = createSerialRunner(async () => {
      runs++;
      if (runs === 1) throw new Error("boom");
    });
    const first = run();
    void run();
    await expect(first).rejects.toThrow("boom");
    await Promise.resolve();
    await Promise.resolve();
    expect(runs).toBe(2);
  });
});

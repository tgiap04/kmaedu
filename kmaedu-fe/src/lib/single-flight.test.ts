import { describe, expect, it, vi } from "vitest";
import { singleFlight } from "./single-flight";

describe("singleFlight", () => {
  it("ignores a second call while the first is still running (double click)", async () => {
    const run = singleFlight();
    let release!: () => void;
    const work = vi.fn(() => new Promise<string>((r) => (release = () => r("done"))));
    const first = run(work);
    const second = run(work);
    release();
    expect(await first).toBe("done");
    expect(await second).toBeUndefined();
    expect(work).toHaveBeenCalledTimes(1);
  });
  it("runs again once the previous call settled, also after a failure", async () => {
    const run = singleFlight();
    await expect(run(() => Promise.reject(new Error("x")))).rejects.toThrow("x");
    expect(await run(async () => 2)).toBe(2);
  });
});

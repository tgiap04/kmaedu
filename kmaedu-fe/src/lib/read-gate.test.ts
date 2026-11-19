import { describe, expect, it } from "vitest";
import { createReadGate } from "./read-gate";

describe("createReadGate", () => {
  it("lets the newest read own the result", () => {
    const gate = createReadGate();
    const first = gate.begin();
    expect(gate.isCurrent(first)).toBe(true);
    const second = gate.begin();
    expect(gate.isCurrent(first)).toBe(false);
    expect(gate.isCurrent(second)).toBe(true);
  });

  it("makes a read that is still on its way stale when the list was changed in place, and asks for a fresh read", () => {
    const gate = createReadGate();
    const read = gate.begin();
    expect(gate.invalidate()).toBe(true);
    expect(gate.isCurrent(read)).toBe(false);
  });

  it("needs no fresh read when nothing was in flight, and a read started after the change is current", () => {
    const gate = createReadGate();
    expect(gate.invalidate()).toBe(false);
    const read = gate.begin();
    expect(gate.isCurrent(read)).toBe(true);
    gate.end(read);
    expect(gate.invalidate()).toBe(false);
  });

  it("stops counting a read once it ended, stale or not", () => {
    const gate = createReadGate();
    const old = gate.begin();
    const fresh = gate.begin();
    gate.end(old);
    expect(gate.invalidate()).toBe(true); // `fresh` is still in flight
    gate.end(fresh);
    expect(gate.invalidate()).toBe(false);
  });
});

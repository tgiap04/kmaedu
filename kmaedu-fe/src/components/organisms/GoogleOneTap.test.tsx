// @vitest-environment jsdom
import { act, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const post = vi.hoisted(() => vi.fn());
vi.mock("@/apis/api", () => ({ api: { post } }));
vi.mock("@/stores/useAuthStore", () => {
  const state = { isAuthenticated: false, initializing: false };
  return { useAuthStore: (select: (s: typeof state) => unknown) => select(state) };
});
const utm = vi.hoisted(() => ({ clear: vi.fn() }));
vi.mock("@/lib/utmSource", () => ({ getUtmSource: () => null, clearUtmSource: utm.clear }));

const { GoogleOneTap } = await import("./GoogleOneTap");

/** Renders the component, fires the script's onload and returns the credential callback it registered. */
async function mountAndGetCallback() {
  let callback!: (r: { credential: string }) => Promise<void>;
  window.google = {
    accounts: { id: { initialize: (c) => { callback = c.callback as typeof callback; }, prompt: vi.fn(), disableAutoSelect: vi.fn() } },
  };
  render(<GoogleOneTap />);
  const script = document.head.querySelector<HTMLScriptElement>("script[src*='gsi/client']")!;
  await act(async () => script.onload?.(new Event("load")));
  return callback;
}

afterEach(() => {
  vi.unstubAllGlobals();
  post.mockReset();
  utm.clear.mockReset();
});

describe("google One Tap", () => {
  it("reloads once the backend has set the session cookies (the body carries no token)", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    post.mockResolvedValue({ data: { success: true, user: { id: "u1" }, roles: [], permissions: [] } });

    const callback = await mountAndGetCallback();
    await act(async () => callback({ credential: "c" }));

    expect(reload).toHaveBeenCalledTimes(1);
    expect(utm.clear).toHaveBeenCalledTimes(1);
  });

  it("does not reload when the sign-in was refused", async () => {
    const reload = vi.fn();
    vi.stubGlobal("location", { ...window.location, reload });
    post.mockRejectedValue(new Error("Invalid Google credential"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    const callback = await mountAndGetCallback();
    await act(async () => callback({ credential: "c" }));

    expect(reload).not.toHaveBeenCalled();
  });
});

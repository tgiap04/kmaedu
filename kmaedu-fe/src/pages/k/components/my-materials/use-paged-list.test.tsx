// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { usePagedList } from "./use-paged-list";

function deferred<T>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe("usePagedList", () => {
  it("keeps the latest page when an earlier request answers last", async () => {
    const pending = new Map<number, ReturnType<typeof deferred<string>>>();
    const fetchPage = (page: number) => {
      const d = deferred<string>();
      pending.set(page, d);
      return d.promise;
    };
    const { result } = renderHook(() => usePagedList(fetchPage));

    act(() => result.current.setPage(2));
    act(() => result.current.setPage(3));
    await act(async () => pending.get(3)!.resolve("page 3"));
    await act(async () => pending.get(2)!.resolve("page 2"));
    await act(async () => pending.get(1)!.resolve("page 1"));

    expect(result.current.page).toBe(3);
    expect(result.current.data).toBe("page 3");
  });

  it("does not flag a failure from a page the user already left", async () => {
    const pending = new Map<number, ReturnType<typeof deferred<string>>>();
    const fetchPage = (page: number) => {
      const d = deferred<string>();
      pending.set(page, d);
      return d.promise;
    };
    const { result } = renderHook(() => usePagedList(fetchPage));

    act(() => result.current.setPage(2));
    await act(async () => pending.get(2)!.resolve("page 2"));
    await act(async () => pending.get(1)!.reject(new Error("timeout")));

    expect(result.current.failed).toBe(false);
    expect(result.current.data).toBe("page 2");
  });
});

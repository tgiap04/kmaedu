import { afterEach, describe, expect, it, vi } from "vitest";
import { downloadFile } from "./download-file";

afterEach(() => vi.unstubAllGlobals());

describe("downloadFile", () => {
  it.each(["", "   ", "javascript:alert(1)", "/relative/page", "data:text/html,x"])(
    "refuses %j without fetching (an empty url would fetch the current page)",
    async (url) => {
      const fetch = vi.fn();
      vi.stubGlobal("fetch", fetch);
      await expect(downloadFile(url, "a.pdf")).rejects.toThrow();
      expect(fetch).not.toHaveBeenCalled();
    },
  );

  it("fetches an http(s) url", async () => {
    const fetch = vi.fn().mockResolvedValue({ ok: false });
    vi.stubGlobal("fetch", fetch);
    await expect(downloadFile("https://bucket.r2.cloudflarestorage.com/a.pdf?X-Amz-Signature=s", "a.pdf")).rejects.toThrow("Download failed");
    expect(fetch).toHaveBeenCalledTimes(1);
  });
});

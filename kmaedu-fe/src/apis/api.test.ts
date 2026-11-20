import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios";
import { AxiosError } from "axios";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api, refreshAccessToken, registerAuthBridge } from "./api";

vi.mock("@/lib/env", () => ({ env: { apiUrl: "http://test/api/v1" } }));
vi.mock("@/lib/deviceId", () => ({ getOrCreateDeviceId: () => "device-1" }));
vi.mock("@/lib/navigation", () => ({ navigateTo: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ default: { t: (key: string) => key } }));
vi.mock("@/components/antd/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

/** The session description the backend returns: tokens only travel in HttpOnly cookies. */
const sessionBody = { success: true, user: { id: "u1" }, roles: ["STUDENT"], permissions: ["flashcard:study"] };

type Handler = (config: InternalAxiosRequestConfig) => { status: number; data: unknown };

function installAdapter(handler: Handler) {
  const seen: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const { status, data } = handler(config);
    const response = { status, data, statusText: "", headers: {}, config };
    if (status >= 400) throw new AxiosError("failed", undefined, config, undefined, response);
    return response;
  };
  api.defaults.adapter = adapter;
  return seen;
}

describe("refreshAccessToken (cookie-only session)", () => {
  const applySession = vi.fn();
  const originalAdapter = api.defaults.adapter;

  beforeEach(() => {
    applySession.mockReset();
    registerAuthBridge({ applySession, refetchUser: vi.fn() });
  });
  afterEach(() => {
    api.defaults.adapter = originalAdapter;
  });

  it("succeeds on a 2xx without any token in the body and applies the new roles", async () => {
    installAdapter(() => ({ status: 201, data: sessionBody }));

    await refreshAccessToken();

    expect(applySession).toHaveBeenCalledWith({
      user: sessionBody.user,
      roles: sessionBody.roles,
      permissions: sessionBody.permissions,
    });
  });

  it("rejects when the backend does not confirm the refresh", async () => {
    installAdapter(() => ({ status: 200, data: {} }));

    await expect(refreshAccessToken()).rejects.toThrow("Làm mới phiên đăng nhập thất bại");
  });

  it("retries an expired request after the refresh, relying on the cookie (no Authorization header)", async () => {
    let profileCalls = 0;
    const seen = installAdapter((config) => {
      if (config.url === "/auth/refresh") return { status: 201, data: sessionBody };
      profileCalls += 1;
      return profileCalls === 1
        ? { status: 401, data: { code: "TOKEN_EXPIRED" } }
        : { status: 200, data: { ok: true } };
    });

    const res = await api.get("/profile");

    expect(res.data).toEqual({ ok: true });
    const retried = seen.filter((c) => c.url === "/profile")[1];
    expect(retried.headers.authorization).toBeUndefined();
    expect(retried.headers.Authorization).toBeUndefined();
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

const authApi = vi.hoisted(() => ({ signupApi: vi.fn(), loginApi: vi.fn() }));

vi.mock("@/apis/authApi", () => authApi);
vi.mock("@/apis/api", () => ({ refreshAccessToken: vi.fn(), registerAuthBridge: vi.fn() }));
vi.mock("@/components/antd/toast", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));
vi.mock("@/lib/env", () => ({ env: { apiUrl: "http://test/api/v1" } }));
vi.mock("@/lib/utmSource", () => ({ clearUtmSource: vi.fn(), encodeUtmState: vi.fn(), getUtmSource: () => null }));
vi.mock("@/lib/authRedirect", () => ({
  clearRedirectBackTarget: vi.fn(),
  getRedirectBackTarget: () => "/k",
  normalizeReturnPath: (p: string) => p,
}));

const { useAuthStore } = await import("./useAuthStore");

/** What login/register return now: no token, refresh token or session id (they are httpOnly cookies). */
const cookieOnlySession = {
  success: true,
  message: "Đăng ký thành công",
  user: { id: "u1", email: "a@b.c", username: "a" },
  roles: ["STUDENT"],
  permissions: ["flashcard:study"],
};

describe("useAuthStore with a cookie-only backend", () => {
  beforeEach(() => {
    useAuthStore.setState({ user: null, roles: [], permissions: [], isAuthenticated: false });
  });

  it("signup succeeds without a token in the body and applies the session", async () => {
    authApi.signupApi.mockResolvedValue(cookieOnlySession);

    const result = await useAuthStore.getState().signup({ username: "a", email: "a@b.c", password: "Passw0rd!" });

    expect(result.redirectTo).toBe("/k");
    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, roles: ["STUDENT"] });
  });

  it("login succeeds without a token in the body and applies the session", async () => {
    authApi.loginApi.mockResolvedValue({ ...cookieOnlySession, message: undefined });

    await useAuthStore.getState().login({ credential: "a", password: "Passw0rd!" });

    expect(useAuthStore.getState()).toMatchObject({ isAuthenticated: true, permissions: ["flashcard:study"] });
  });
});

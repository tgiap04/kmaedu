import { beforeEach, describe, expect, it, vi } from "vitest";
import { listAuditApi, listUsersApi } from "./adminApi";

const get = vi.fn();
vi.mock("./api", () => ({ api: { get: (...args: unknown[]) => get(...args) } }));
vi.mock("@/lib/env", () => ({ env: { apiUrl: "http://test/api/v1" } }));

const FROM = "2026-01-01T00:00:00.000Z";
const TO = "2026-01-31T23:59:59.999Z";

/** admin-service validates these queries with `.strict()`: `from`/`to` would be a 400. */
describe("admin list date filters", () => {
  beforeEach(() => {
    get.mockReset();
    get.mockResolvedValue({ data: { data: [], total: 0 } });
  });

  it("users list sends the date range as createdFrom/createdTo", async () => {
    await listUsersApi({ search: "an", from: FROM, to: TO, page: 2, pageSize: 10 });
    expect(get).toHaveBeenCalledWith("/admin/users", {
      params: { search: "an", createdFrom: FROM, createdTo: TO, page: 2, pageSize: 10 },
    });
  });

  it("audit list sends the date range as createdFrom/createdTo", async () => {
    await listAuditApi({ action: "admin.user.ban", from: FROM, to: TO, page: 1 });
    expect(get).toHaveBeenCalledWith("/admin/audit", {
      params: { action: "admin.user.ban", createdFrom: FROM, createdTo: TO, page: 1 },
    });
  });

  it("sends no date keys when no range is picked", async () => {
    await listAuditApi({ page: 1, from: undefined, to: undefined });
    const params = get.mock.calls[0][1].params as Record<string, unknown>;
    expect(params).toEqual({ page: 1 });
    expect(Object.keys(params)).not.toContain("from");
  });
});

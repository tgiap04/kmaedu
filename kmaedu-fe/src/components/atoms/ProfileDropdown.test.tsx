// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfileDropdown from "./ProfileDropdown";

const auth = { roles: ["STUDENT"] as string[], permissions: [] as string[], logout: vi.fn() };
vi.mock("@/stores/useAuthStore", () => ({ useAuthStore: (select?: (s: typeof auth) => unknown) => (select ? select(auth) : auth) }));
vi.mock("@/hooks/useCan", () => ({ useCan: (p: string) => auth.permissions.includes(p) }));

function openMenu() {
  render(<MemoryRouter><ProfileDropdown data={{ name: "Trần Minh Khoa", email: "khoa@example.com" }} variant="header" /></MemoryRouter>);
  fireEvent.click(screen.getAllByRole("button")[0]);
}

describe("profile dropdown history link", () => {
  beforeEach(() => {
    auth.permissions = [];
    auth.roles = ["STUDENT"];
  });

  it("is hidden from a student", () => {
    auth.permissions = ["exam:take"];
    openMenu();
    expect(screen.getByText("Hồ sơ cá nhân")).toBeTruthy();
    expect(screen.queryByText("Lịch sử học tập")).toBeNull();
  });

  it("is shown to someone who can generate with AI", () => {
    auth.permissions = ["ai:generate"];
    openMenu();
    expect(screen.getByText("Lịch sử học tập")).toBeTruthy();
  });
});

describe("profile dropdown avatar", () => {
  it.each([
    [["STUDENT"], "/avatars/student.webp"],
    [["TEACHER"], "/avatars/teacher.webp"],
    [["STUDENT", "SYSTEM_ADMIN"], "/avatars/admin.webp"],
  ])("shows the picture for roles %j", (roles, src) => {
    auth.roles = roles;
    render(<MemoryRouter><ProfileDropdown data={{ name: "Trần Minh Khoa", email: "khoa@example.com" }} variant="header" /></MemoryRouter>);
    const img = screen.getByRole("img") as HTMLImageElement;
    expect(img.getAttribute("src")).toBe(src);
    expect(img.alt).toContain("Trần Minh Khoa");
  });
});

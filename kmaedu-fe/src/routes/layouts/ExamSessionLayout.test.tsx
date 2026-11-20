// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/organisms/nav/header-parts", () => ({ HeaderWaves: () => null, NotificationBell: () => null, dashboardHeaderClass: "" }));
vi.mock("@/components/organisms/nav/header-search", () => ({ HeaderSearch: () => null }));
vi.mock("@/components/atoms/ProfileDropdown", () => ({ default: () => null }));
vi.mock("@/components/atoms/Logo", () => ({ default: () => null }));
vi.mock("@/stores/useAuthStore", () => ({ useAuthStore: () => ({ user: { name: "Khoa", email: "" } }) }));

const { ExamSessionLayout } = await import("./ExamSessionLayout");

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

describe("exam session layout, back button", () => {
  it("goes to the exam list when the page was opened directly, even if the tab has outside history", () => {
    window.history.pushState({}, "", "/somewhere-else");
    render(
      <MemoryRouter initialEntries={["/exam-session/s1"]}>
        <Routes>
          <Route path="/exam-session/:id" element={<ExamSessionLayout><p>Phòng chờ</p></ExamSessionLayout>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByTestId("where").textContent).toBe("/k/my-exams");
  });

  it("goes back inside the app when there is an in-app page to return to", () => {
    render(
      <MemoryRouter initialEntries={["/k/my-exams", "/exam-session/s1"]} initialIndex={1}>
        <Routes>
          <Route path="/exam-session/:id" element={<ExamSessionLayout><p>Phòng chờ</p></ExamSessionLayout>} />
          <Route path="*" element={<Where />} />
        </Routes>
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Quay lại" }));
    expect(screen.getByTestId("where").textContent).toBe("/k/my-exams");
  });
});

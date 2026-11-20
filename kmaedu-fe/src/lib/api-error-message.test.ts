import { describe, expect, it } from "vitest";
import { apiErrorMessage, validationMessage } from "./api-error-message";

describe("validationMessage", () => {
  it("shows the first field problem instead of the bare 'Validation failed'", () => {
    const body = { message: "Validation failed", details: [{ path: "password", message: "Password must be at least 8 characters long" }, { path: "email", message: "Invalid email address" }] };
    expect(validationMessage(body)).toBe("Dữ liệu không hợp lệ: Password must be at least 8 characters long");
  });
  it("keeps the server message when there are no usable details", () => {
    expect(validationMessage({ message: "Validation failed" })).toBe("Validation failed");
    expect(validationMessage({ message: "Validation failed", details: [] })).toBe("Validation failed");
    expect(validationMessage({ message: "Validation failed", details: [{ path: "x" }] })).toBe("Validation failed");
    expect(validationMessage({ message: "Số dư không đủ", details: [{ path: "x", message: "y" }] })).toBe("Số dư không đủ");
  });
});

describe("apiErrorMessage", () => {
  const apiError = (message: string, status?: number) => Object.assign(new Error(message), { status });

  it("shows the backend message for a 4xx error", () => {
    expect(apiErrorMessage(apiError("Phiên thi đã bắt đầu, không thể sửa", 409), "Cập nhật thất bại")).toBe("Phiên thi đã bắt đầu, không thể sửa");
    expect(apiErrorMessage(apiError("Mã mời không tồn tại", 404), "Lỗi")).toBe("Mã mời không tồn tại");
    expect(apiErrorMessage(apiError("Thiếu dữ liệu", 400), "Lỗi")).toBe("Thiếu dữ liệu");
  });

  it("falls back for 5xx, network errors, non-errors and blank messages", () => {
    expect(apiErrorMessage(apiError("Internal server error", 500), "Lỗi chung")).toBe("Lỗi chung");
    expect(apiErrorMessage(apiError("Upstream unavailable", 503), "Lỗi chung")).toBe("Lỗi chung");
    expect(apiErrorMessage(new Error("Network Error"), "Lỗi chung")).toBe("Lỗi chung");
    expect(apiErrorMessage(apiError("   ", 400), "Lỗi chung")).toBe("Lỗi chung");
    expect(apiErrorMessage("boom", "Lỗi chung")).toBe("Lỗi chung");
    expect(apiErrorMessage(undefined, "Lỗi chung")).toBe("Lỗi chung");
  });
});

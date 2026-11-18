import { describe, expect, it } from "vitest";
import { validationMessage } from "./api-error-message";

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

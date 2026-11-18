import { describe, expect, it } from "vitest";
import { PASSWORD_MAX, PASSWORD_MIN, passwordProblem, registerProblem } from "./register-rules";

const ok = { username: "student", email: "student@gmail.com", password: "dev04dev", confirmPassword: "dev04dev" };
const x = (n: number) => "x".repeat(n);

describe("registerProblem (mirrors the backend RegisterSchema)", () => {
  it("accepts a valid form", () => {
    expect(registerProblem(ok)).toBeNull();
  });
  it("rejects the reported case: a 5-character password", () => {
    expect(registerProblem({ ...ok, password: "dev04", confirmPassword: "dev04" })).toBe("signup.error.passwordTooShort");
  });
  it("password length 8–100: 7 and 101 fail, 8 and 100 pass", () => {
    expect(registerProblem({ ...ok, password: x(7), confirmPassword: x(7) })).toBe("signup.error.passwordTooShort");
    expect(registerProblem({ ...ok, password: x(8), confirmPassword: x(8) })).toBeNull();
    expect(registerProblem({ ...ok, password: x(100), confirmPassword: x(100) })).toBeNull();
    expect(registerProblem({ ...ok, password: x(101), confirmPassword: x(101) })).toBe("signup.error.passwordTooLong");
  });
  it("username length 3–20", () => {
    expect(registerProblem({ ...ok, username: "ab" })).toBe("signup.error.usernameLength");
    expect(registerProblem({ ...ok, username: "abc" })).toBeNull();
    expect(registerProblem({ ...ok, username: x(20) })).toBeNull();
    expect(registerProblem({ ...ok, username: x(21) })).toBe("signup.error.usernameLength");
  });
  it("email must look like an address and be at most 50 characters", () => {
    expect(registerProblem({ ...ok, email: "student" })).toBe("signup.error.emailInvalid");
    expect(registerProblem({ ...ok, email: "a@b" })).toBe("signup.error.emailInvalid");
    expect(registerProblem({ ...ok, email: ".a@gmail.com" })).toBe("signup.error.emailInvalid");
    expect(registerProblem({ ...ok, email: "a..b@gmail.com" })).toBe("signup.error.emailInvalid");
    expect(registerProblem({ ...ok, email: "a.@gmail.com" })).toBe("signup.error.emailInvalid");
    expect(registerProblem({ ...ok, email: "a@gmail.c" })).toBe("signup.error.emailInvalid");
    expect(registerProblem({ ...ok, email: "a.b+tag@mail.kma.edu.vn" })).toBeNull();
    expect(registerProblem({ ...ok, email: `${x(40)}@gmail.com` })).toBeNull(); // 50
    expect(registerProblem({ ...ok, email: `${x(41)}@gmail.com` })).toBe("signup.error.emailTooLong"); // 51
  });
  it("still reports a confirmation mismatch, after the field rules", () => {
    expect(registerProblem({ ...ok, confirmPassword: "other123" })).toBe("signup.passwordMismatch");
    expect(registerProblem({ ...ok, password: "dev04", confirmPassword: "other" })).toBe("signup.error.passwordTooShort");
  });
});

describe("passwordProblem (any password a user sets: sign-up, reset, change)", () => {
  it("uses the backend limits 8–100", () => {
    expect([PASSWORD_MIN, PASSWORD_MAX]).toEqual([8, 100]);
    expect(passwordProblem(x(7))).toBe("signup.error.passwordTooShort");
    expect(passwordProblem("")).toBe("signup.error.passwordTooShort");
    expect(passwordProblem(x(8))).toBeNull();
    expect(passwordProblem(x(100))).toBeNull();
    expect(passwordProblem(x(101))).toBe("signup.error.passwordTooLong");
  });
});

import { describe, expect, it } from "vitest";
import { roleAvatar } from "./role-avatar";

describe("roleAvatar", () => {
  it("picks the picture for each role", () => {
    expect(roleAvatar(["STUDENT"]).src).toBe("/avatars/student.webp");
    expect(roleAvatar(["TEACHER"]).src).toBe("/avatars/teacher.webp");
    expect(roleAvatar(["SYSTEM_ADMIN"]).src).toBe("/avatars/admin.webp");
  });

  it("lets admin win over the base role", () => {
    expect(roleAvatar(["STUDENT", "SYSTEM_ADMIN"]).src).toBe("/avatars/admin.webp");
    expect(roleAvatar(["SYSTEM_ADMIN", "TEACHER"]).src).toBe("/avatars/admin.webp");
  });

  it("falls back to the student picture with no known role", () => {
    expect(roleAvatar([]).src).toBe("/avatars/student.webp");
    expect(roleAvatar(["SOMETHING_NEW"]).src).toBe("/avatars/student.webp");
  });

  it("names the role for the alt text", () => {
    expect(roleAvatar(["TEACHER"]).label).toBe("Giáo viên");
    expect(roleAvatar(["SYSTEM_ADMIN"]).label).toBe("Quản trị viên");
    expect(roleAvatar([]).label).toBe("Học sinh");
  });
});

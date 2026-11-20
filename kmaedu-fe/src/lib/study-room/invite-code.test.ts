import { describe, expect, it } from "vitest";
import { INVITE_CODE_LENGTH, isInviteCode, normalizeInviteCode } from "./invite-code";

describe("study-room invite code", () => {
  it("keeps letters and digits only, upper-cased, at most 8", () => {
    expect(normalizeInviteCode(" k7m2-q9xa ")).toBe("K7M2Q9XA");
    expect(normalizeInviteCode("k7m2q9xa99")).toBe("K7M2Q9XA");
    expect(normalizeInviteCode("áb!c")).toBe("BC");
  });

  it("accepts exactly 8 characters of the code alphabet", () => {
    expect(INVITE_CODE_LENGTH).toBe(8);
    expect(isInviteCode("K7M2Q9XA")).toBe(true);
    expect(isInviteCode("123456")).toBe(false);
    expect(isInviteCode("K7M2Q9X")).toBe(false);
    // 0, O, 1, I and L are never in a code: a code typed with them is a typo.
    expect(isInviteCode("K7M2Q9X0")).toBe(false);
    expect(isInviteCode("K7M2Q9XI")).toBe(false);
  });
});

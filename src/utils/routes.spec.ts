import { describe, expect, test } from "vitest";
import { resolveLandingRoute } from "./routes";
import type { UserResponse } from "../api/models";

const baseUser: UserResponse = {
  id: "user-1",
  personalId: "12345678A",
  number: 1,
  fullName: "Test User",
  address: "Calle Test 1",
  email: "test@example.com",
  phoneNumber: "600000000",
  enabled: true,
  memberships: {},
  isPlatformAdmin: false,
};

describe("resolveLandingRoute", () => {
  test("user with community memberships lands on /", () => {
    const user: UserResponse = {
      ...baseUser,
      isPlatformAdmin: false,
      memberships: { "community-1": "COMMUNITY_MEMBER" },
    };
    expect(resolveLandingRoute(user)).toBe("/");
  });

  test("platform admin with memberships still lands on /", () => {
    const user: UserResponse = {
      ...baseUser,
      isPlatformAdmin: true,
      memberships: { "community-1": "COMMUNITY_ADMIN" },
    };
    expect(resolveLandingRoute(user)).toBe("/");
  });

  test("platform admin with no memberships lands on /platform", () => {
    const user: UserResponse = {
      ...baseUser,
      isPlatformAdmin: true,
      memberships: {},
    };
    expect(resolveLandingRoute(user)).toBe("/platform");
  });

  test("platform admin with undefined memberships lands on /platform", () => {
    // Intentionally testing behavior when `memberships` is absent at runtime,
    // even though the generated type now requires it — narrow assertion scoped
    // to this one field.
    const user = {
      ...baseUser,
      isPlatformAdmin: true,
      memberships: undefined,
    } as unknown as UserResponse;
    expect(resolveLandingRoute(user)).toBe("/platform");
  });

  test("user with no memberships and not platform admin lands on /no-community", () => {
    const user: UserResponse = {
      ...baseUser,
      isPlatformAdmin: false,
      memberships: {},
    };
    expect(resolveLandingRoute(user)).toBe("/no-community");
  });

  test("user with no memberships and isPlatformAdmin undefined lands on /no-community", () => {
    // Intentionally testing behavior when `isPlatformAdmin` is absent at runtime,
    // even though the generated type now requires it — narrow assertion scoped
    // to this one field.
    const user = {
      ...baseUser,
      isPlatformAdmin: undefined,
      memberships: {},
    } as unknown as UserResponse;
    expect(resolveLandingRoute(user)).toBe("/no-community");
  });
});

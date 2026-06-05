import { describe, expect, test } from "vitest";
import { resolveLandingRoute } from "./routes";
import type { UserResponse } from "../api/models";

describe("resolveLandingRoute", () => {
  test("user with community memberships lands on /", () => {
    const user: UserResponse = {
      isPlatformAdmin: false,
      memberships: { "community-1": "COMMUNITY_MEMBER" },
    };
    expect(resolveLandingRoute(user)).toBe("/");
  });

  test("platform admin with memberships still lands on /", () => {
    const user: UserResponse = {
      isPlatformAdmin: true,
      memberships: { "community-1": "COMMUNITY_ADMIN" },
    };
    expect(resolveLandingRoute(user)).toBe("/");
  });

  test("platform admin with no memberships lands on /platform", () => {
    const user: UserResponse = {
      isPlatformAdmin: true,
      memberships: {},
    };
    expect(resolveLandingRoute(user)).toBe("/platform");
  });

  test("platform admin with undefined memberships lands on /platform", () => {
    const user: UserResponse = {
      isPlatformAdmin: true,
      memberships: undefined,
    };
    expect(resolveLandingRoute(user)).toBe("/platform");
  });

  test("user with no memberships and not platform admin lands on /no-community", () => {
    const user: UserResponse = {
      isPlatformAdmin: false,
      memberships: {},
    };
    expect(resolveLandingRoute(user)).toBe("/no-community");
  });

  test("user with no memberships and isPlatformAdmin undefined lands on /no-community", () => {
    const user: UserResponse = {
      memberships: {},
    };
    expect(resolveLandingRoute(user)).toBe("/no-community");
  });
});

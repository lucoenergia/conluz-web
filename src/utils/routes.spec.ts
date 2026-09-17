import { describe, expect, test } from "vitest";
import { resolveCommunityScopedTarget, resolveLandingRoute } from "./routes";
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

describe("resolveCommunityScopedTarget", () => {
  it("sends a plant detail route back to the plants list", () => {
    expect(resolveCommunityScopedTarget("/production/plant-a", "")).toBe("/production");
  });

  it("sends every nested plant route back to the plants list, however deep", () => {
    expect(resolveCommunityScopedTarget("/production/plant-a/edit", "")).toBe("/production");
    expect(resolveCommunityScopedTarget("/production/plant-a/sharing-agreements", "")).toBe("/production");
    expect(resolveCommunityScopedTarget("/production/plant-a/sharing-agreements/agreement-1", "")).toBe("/production");
  });

  it("sends a supply detail route back to the supplies list", () => {
    expect(resolveCommunityScopedTarget("/supply-points/supply-a", "")).toBe("/supply-points");
    expect(resolveCommunityScopedTarget("/supply-points/supply-a/edit", "")).toBe("/supply-points");
  });

  // The creation forms hold no foreign entity -- only a half-typed draft, which
  // the remount clears anyway. Bouncing the user out of them would be rude.
  it("leaves the creation forms alone", () => {
    expect(resolveCommunityScopedTarget("/production/new", "")).toBeNull();
    expect(resolveCommunityScopedTarget("/supply-points/new", "")).toBeNull();
  });

  it("leaves the section index routes alone -- they re-key on their own", () => {
    expect(resolveCommunityScopedTarget("/production", "")).toBeNull();
    expect(resolveCommunityScopedTarget("/supply-points", "")).toBeNull();
    expect(resolveCommunityScopedTarget("/production/", "")).toBeNull();
  });

  it("strips a ?personId= filter, which is scoped to a user and not to a community", () => {
    expect(resolveCommunityScopedTarget("/supply-points", "?personId=user-1")).toBe("/supply-points");
  });

  it("keeps other query strings on the supplies list", () => {
    expect(resolveCommunityScopedTarget("/supply-points", "?page=2")).toBeNull();
  });

  it("leaves community-agnostic routes alone", () => {
    for (const pathname of ["/", "/profile", "/members", "/integrations", "/users", "/users/user-1/edit", "/platform", "/communities/community-1/edit", "/no-community"]) {
      expect(resolveCommunityScopedTarget(pathname, "")).toBeNull();
    }
  });
});

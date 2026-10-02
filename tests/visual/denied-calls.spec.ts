import { test as base, expect } from "@playwright/test";
import {
  ALLOWED_DENIALS,
  FIXED_COMMUNITY_ID,
  FIXED_MEMBER_USER,
  injectAuthToken,
  isReportable,
  mockAllApiRoutes,
  seedActiveCommunity,
} from "./fixtures";

/**
 * The denied-call check, checked.
 *
 * The listener in fixtures/test.ts fails a test on an unexpected 403/404, which
 * makes it the one assertion in the suite that catches a screen offering
 * something the backend refuses -- and also the one assertion that is invisible
 * when it stops working. A listener that reports nothing passes every test, so
 * both halves of the chain are asserted here: the mocks really do refuse, and a
 * refusal really is reported.
 *
 * Uses the BASE `test` on purpose. The extended one asserts no denials at
 * teardown, and this file provokes one deliberately.
 */

base.describe("the denied-call check itself", () => {
  base("a mock refuses a call the caller's capabilities do not allow", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    // Any page, only to get the app's origin so a relative fetch resolves.
    await page.goto("/");

    // A member has canManage false, and community config is governed by it.
    const status = await page.evaluate(async (communityId) => {
      const response = await fetch(`/api/v1/communities/${communityId}/config/datadis`);
      return response.status;
    }, FIXED_COMMUNITY_ID);

    expect(
      status,
      "mockAllApiRoutes must refuse what the served capabilities refuse, or the response listener " +
        "has nothing to catch and passes vacuously",
    ).toBe(403);
  });

  base("a mock allows the same call for a caller whose capabilities do allow it", async ({ page }) => {
    const admin = { ...FIXED_MEMBER_USER, memberships: { [FIXED_COMMUNITY_ID]: "COMMUNITY_ADMIN" } };
    await injectAuthToken(page);
    await seedActiveCommunity(page, admin.id);
    await mockAllApiRoutes(page, admin);
    await page.goto("/");

    const status = await page.evaluate(async (communityId) => {
      const response = await fetch(`/api/v1/communities/${communityId}/config/datadis`);
      return response.status;
    }, FIXED_COMMUNITY_ID);

    // The mirror of the test above. Without it, a mock that refused everything
    // would satisfy the first assertion and break every other spec for the
    // wrong reason.
    expect(status, "the same call must succeed for a caller whose capabilities allow it").toBe(200);
  });

  base("reports an unexpected refusal", () => {
    expect(isReportable("GET", "/api/v1/communities/abc/config/datadis", 403)).toBe(true);
    expect(isReportable("GET", "/api/v1/users/abc", 404)).toBe(true);
  });

  base("stays quiet about successes and about non-API traffic", () => {
    expect(isReportable("GET", "/api/v1/communities/abc", 200)).toBe(false);
    expect(isReportable("GET", "/src/main.tsx", 404)).toBe(false);
  });

  base("stays quiet about each recorded exception, and only about those", () => {
    for (const entry of ALLOWED_DENIALS) {
      const path = entry.path.source
        .replace(/\\\//g, "/")
        .replace(/\[\^\/\]\+/g, "x")
        .replace(/[$^]/g, "");
      expect(isReportable(entry.method, path, entry.status), `${path} should be allowed`).toBe(false);
      // The exception is for one status, not for the endpoint: the same path
      // answering 403 is still a finding.
      const otherStatus = entry.status === 404 ? 403 : 404;
      expect(isReportable(entry.method, path, otherStatus), `${path} ${otherStatus} should report`).toBe(true);
    }
  });

  base("says why each exception is allowed", () => {
    const unexplained = ALLOWED_DENIALS.filter((entry) => entry.reason.trim().length < 40);
    expect(
      unexplained.map((entry) => entry.path.source),
      "An allowed denial needs a reason that survives reading: why does the app ask a question " +
        "whose answer is legitimately no?",
    ).toEqual([]);
  });
});

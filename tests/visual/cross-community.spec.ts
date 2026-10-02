import {
  test,
  expect,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  FIXED_SUPPLY_OTHER_COMMUNITY,
  FIXED_USER_2,
  injectAuthToken,
  mockAllApiRoutes,
  mockUserSuppliesAcrossCommunities,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

/**
 * Nothing belonging to another community surfaces under this one's heading.
 *
 * Measured assertions, no screenshots: a row that should not be there is a
 * presence, and naming it in an assertion says more than a diff would -- and
 * cannot be absorbed by a pixel tolerance. The same rule has unit coverage in
 * SupplyPointsPage.spec.tsx; this is the walkthrough version, over the real
 * router, the real community context and the real query cache.
 *
 * Both personas also pass under the denied-call listener from ./fixtures, so
 * neither walk may provoke a 403 or 404 on the way.
 */

test.describe("cross-community scope", () => {
  test("a member's own supply list shows only the active community", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);

    await page.goto("/supply-points");
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByRole("heading", { name: "Casa Principal" })).toBeVisible();
    await expect(
      page.getByText(FIXED_SUPPLY_OTHER_COMMUNITY.community.name ?? "Vecinos del Sur"),
    ).toHaveCount(0);
  });

  test("one member's supplies, seen by an admin of two communities, show only the active one", async ({ page }) => {
    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    // The listing answers with both communities' rows, as it does for a caller
    // entitled to read both (conluz#326).
    await mockUserSuppliesAcrossCommunities(page);

    await page.goto(`/supply-points?personId=${FIXED_USER_2.id}`);
    await expect(page.getByRole("main")).toBeVisible();
    await stabilizePage(page);

    await expect(page.getByRole("heading", { name: "Casa Principal" })).toBeVisible();
    // Readable by this caller, and still not this community's business.
    await expect(
      page.getByRole("heading", { name: FIXED_SUPPLY_OTHER_COMMUNITY.name ?? "Casa en otra comunidad" }),
    ).toHaveCount(0);
  });
});

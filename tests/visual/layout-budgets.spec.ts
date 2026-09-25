/**
 * Layout budgets: measured assertions, not screenshot baselines.
 *
 * Nothing in this file calls toHaveScreenshot(), so it has no PNG under
 * __screenshots__ and never needs a baseline regenerated. Each test measures
 * the one property it cares about (a header's rendered height, whether the
 * counters sit on one row, whether a label is clipped) and asserts an explicit
 * bound.
 *
 * Prefer this pattern whenever the thing under test can be measured:
 *   - An unrelated change elsewhere on the page (copy, a table column, the
 *     side menu) cannot invalidate it, so it produces no review churn.
 *   - A failure names the broken property and its value, instead of a pixel
 *     diff someone has to interpret.
 *   - The bound is exact. A screenshot's maxDiffPixelRatio can absorb a real
 *     regression that is small relative to the capture.
 *   - Agents can change and keep it green on their own; baselines need a
 *     maintainer.
 * Screenshots stay the right tool for "does this look right", which has no
 * single number to assert.
 */

import { test, expect, type Page } from "@playwright/test";
import {
  FIXED_COEFFICIENTS_MIXED,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_MEMBER_USER,
  FIXED_PLATFORM_ADMIN_USER,
  FIXED_SHARING_AGREEMENTS,
  injectAuthToken,
  mockAllApiRoutes,
  mockSharingAgreementDetailRoutes,
  mockSharingAgreementsPlantRoutes,
  navigateToSharingAgreementDetail,
  navigateToSharingAgreements,
  openPlantDetail,
  PUBLISHED_AGREEMENT,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

test.describe("Visual baselines", () => {
  /**
   * AC1. The redesign exists because the old header pushed the page's content
   * off a phone's first viewport, so the budget is the acceptance criterion
   * itself rather than a stylistic preference — measured, not eyeballed.
   */
  test("AC1: the collapsed headers fit a 390px viewport", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The 120px budget is specified against a 390px viewport.");

    await openPlantDetail(page);

    const plantHeader = await page.getByTestId("detail-header").boundingBox();
    testInfo.annotations.push({ type: "plant header height", description: `${plantHeader?.height}px` });
    console.log(`AC1 plant header height: ${plantHeader?.height}px`);
    expect(plantHeader?.height).toBeLessThanOrEqual(120);
  });

  /**
   * The agreement header is measured too, but against a regression guard rather
   * than AC1's figure. AC1 states its 120px budget for a PLANT, and this header
   * carries two things a plant's does not: a status badge and a link to the
   * plant it belongs to. At 390px the fixture's name ("Reparto vecinos bloque
   * A") also takes two lines on its own. The bound below exists to catch the
   * header growing further, and is deliberately not dressed up as the AC.
   */
  test("the collapsed agreement header stays within its measured budget at 390px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The budget is measured against a 390px viewport.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
    await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
    await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
    await mockSharingAgreementDetailRoutes(page, PUBLISHED_AGREEMENT.id, PUBLISHED_AGREEMENT, FIXED_COEFFICIENTS_MIXED, 200);

    await navigateToSharingAgreementDetail(page, PUBLISHED_AGREEMENT.name);

    const agreementHeader = await page.getByTestId("detail-header").boundingBox();
    testInfo.annotations.push({ type: "agreement header height", description: `${agreementHeader?.height}px` });
    console.log(`Agreement header height: ${agreementHeader?.height}px`);
    expect(agreementHeader?.height).toBeLessThanOrEqual(150);
  });

  // -------------------------------------------------------------------------
  // List headers
  // -------------------------------------------------------------------------

  /**
   * Every list page the suite can actually reach with its existing fixtures.
   *
   * /members is absent, for the reason the file header already gives for its
   * guard: it redirects on a cold goto before community selection resolves. It
   * also has no memberships fixture — the broad communities mock would answer
   * that call with a list of communities. Its header is the same three-counter
   * shape as /users, which IS measured below, and the page itself stays covered
   * by MembersPage.spec.tsx.
   */
  const LIST_PAGES: { name: string; open: (page: Page) => Promise<void> }[] = [
    {
      name: "/production",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
        await page.goto("/production");
        await stabilizePage(page);
      },
    },
    {
      name: "/supply-points",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
        await mockAllApiRoutes(page, FIXED_MEMBER_USER);
        await page.goto("/supply-points");
        await stabilizePage(page);
      },
    },
    {
      name: "/users",
      open: async (page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto("/users");
        await stabilizePage(page);
      },
    },
    {
      name: "/communities",
      open: async (page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto("/communities");
        await stabilizePage(page);
      },
    },
    {
      name: "sharing agreements list",
      open: async (page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockSharingAgreementsPlantRoutes(page, FIXED_SHARING_AGREEMENTS);
        await navigateToSharingAgreements(page);
      },
    },
  ];

  /**
   * AC1 and AC2, measured rather than eyeballed.
   *
   * Two separate promises, and a counter strip can keep one while breaking the
   * other. "One row" alone is satisfied by three cells that each clip their
   * label to "Inac…", which is the layout doing the reader no favours; so the
   * labels are checked for actual clipping too, by asking each one whether it
   * overflows its own box.
   *
   * Heights are recorded for every page, not just the one AC2 bounds, so the
   * next person changing this header can see what it costs everywhere.
   */
  for (const listPage of LIST_PAGES) {
    test(`AC1: the ${listPage.name} header keeps its counters on one unclipped row at 390px`, async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "AC1 is specified against a 390px viewport.");

      await listPage.open(page);

      const header = page.getByTestId("list-header");
      await expect(header).toBeVisible();

      const box = await header.boundingBox();
      testInfo.annotations.push({
        type: "list header height",
        description: `${listPage.name}: ${box?.height}px`,
      });
      console.log(`List header height — ${listPage.name}: ${box?.height}px`);

      // The strip's captions are exactly the counter labels: the title is an
      // h1 and the subtitle is body2, so nothing else in the header is one.
      const labels = header.locator(".MuiTypography-caption");
      const labelCount = await labels.count();
      expect(labelCount).toBeGreaterThanOrEqual(2);

      const tops = await labels.evaluateAll((nodes) =>
        nodes.map((node) => Math.round(node.getBoundingClientRect().top)),
      );
      expect(new Set(tops).size, `counters on ${listPage.name} span ${new Set(tops).size} rows`).toBe(1);

      const clipped = await labels.evaluateAll((nodes) =>
        nodes.filter((node) => node.scrollWidth > node.clientWidth).map((node) => node.textContent),
      );
      expect(clipped, `clipped counter labels on ${listPage.name}`).toEqual([]);
    });
  }

  /**
   * AC2. The plants list is the page the budget is stated against: two
   * counters, the shortest header of the eight, and the one whose old version
   * spent three rows on a single column of stats.
   */
  test("AC2: the /production list header is at most 140px at 390px", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The 140px budget is specified against a 390px viewport.");

    await LIST_PAGES[0].open(page);

    const box = await page.getByTestId("list-header").boundingBox();
    testInfo.annotations.push({ type: "production list header height", description: `${box?.height}px` });
    console.log(`AC2 /production list header height: ${box?.height}px`);
    expect(box?.height).toBeLessThanOrEqual(140);
  });
});

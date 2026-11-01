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

import { type Page } from "@playwright/test";
import type { CommunityResponse, SupplyResponse } from "../../src/api/models";
import {
  test,
  expect,
  communityCapabilitiesFor,
  FIXED_COEFFICIENTS_MIXED,
  FIXED_COMMUNITY_ADMINS,
  FIXED_COMMUNITY_ADMIN_USER,
  FIXED_COMMUNITY_ID,
  FIXED_MEMBER_USER,
  FIXED_MEMBERSHIPS,
  FIXED_PLANT_ID,
  FIXED_PLATFORM_ADMIN_USER,
  FIXED_PLATFORM_ADMINS,
  FIXED_SHARING_AGREEMENTS,
  FIXED_SUPPLY,
  FIXED_SUPPLY_ID,
  injectAuthToken,
  MEMBER_HOURLY_PROFILE_GAPS,
  MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE,
  mockAllApiRoutes,
  mockCommunityAdminsRoutes,
  mockPlatformAdminsRoutes,
  mockCommunityManagementRoutes,
  mockMemberHome,
  mockPlantDetailRoutes,
  mockSharingAgreementDetailRoutes,
  mockSharingAgreementsPlantRoutes,
  navigateToSharingAgreementDetail,
  navigateToSharingAgreements,
  openPlantDetail,
  PUBLISHED_AGREEMENT,
  seedActiveCommunity,
  stabilizePage,
} from "./fixtures";

// Real scrollbars, so a vertical scrollbar takes width as it does for a desktop
// user: Playwright passes --hide-scrollbars to headless Chromium, which made the
// #220 resize loop impossible to reproduce here. File-wide because a launch
// option cannot be set per group. The mobile project emulates overlay
// scrollbars, which take no width, so the 390px budgets measure what they did.
test.use({ launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] } });

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
   * Every list page whose header carries counters.
   *
   * /members is absent because its header is the same counter-strip shape as
   * the lists measured below — not because it cannot be reached. It has
   * a roster fixture and a capture of its own now
   * (community-management.spec.ts), and CapabilityRoute waits for the
   * capability answer, so a cold goto lands.
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
      name: "/platform-admins",
      open: async (page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await mockPlatformAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto("/platform-admins");
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

  /**
   * #201 AC10. The member home's two charts need more width than a phone has.
   * They must scroll inside their own containers: the page must not scroll
   * sideways, and the axis must not be squeezed to fit. A screenshot of either
   * block cannot show this -- it captures the block, not the page's width --
   * and a hidden table once widened the whole page to 615 px with every
   * capture still looking plausible.
   */
  test("#201 AC10: the member home's charts scroll inside their containers at 390px, never the page", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "AC10 is specified against a 390px viewport.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    await mockMemberHome(page, FIXED_MEMBER_USER, {
      monthly: MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE,
      hourly: MEMBER_HOURLY_PROFILE_GAPS,
    });
    await page.goto("/home/member");
    // Structural: ApexCharts' SVG has no role or name of its own.
    await expect(page.locator("svg.apexcharts-svg")).toHaveCount(3);
    await stabilizePage(page);

    const widths = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(widths).toEqual({ viewport: 390, document: 390 });

    for (const name of ["Tus últimos 12 meses", "Tus mejores horas para autoconsumir"]) {
      // Structural: the scroll container is the chart canvas's nearest scrolling ancestor.
      const scroller = await page.getByRole("region", { name }).evaluate((region) => {
        let el = region.querySelector(".apexcharts-canvas")?.parentElement ?? null;
        while (el && getComputedStyle(el).overflowX !== "auto") el = el.parentElement;
        return el && { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, regionWidth: region.clientWidth };
      });
      expect(scroller, `${name} has a scroll container`).not.toBeNull();
      // The chart keeps its width and scrolls, inside a block no wider than the page.
      expect(scroller!.scrollWidth, `${name} keeps its chart wider than the screen`).toBeGreaterThan(scroller!.clientWidth);
      expect(scroller!.regionWidth, `${name} fits the page`).toBeLessThanOrEqual(390);
    }
  });

  /**
   * #220. The same two charts, measured over time rather than at one instant.
   *
   * The scroll area once let its content's height decide its width: one pixel
   * of hidden hover chrome below the chart gave it a vertical scrollbar, the
   * scrollbar narrowed it, ApexCharts redrew at the new width, and the redraw
   * removed the scrollbar again -- a loop for as long as the pointer stayed on
   * the chart. None of it shows in a capture: a screenshot is one frame taken
   * with the pointer elsewhere, and headless Chromium hides scrollbars unless
   * told not to. So these tests run with real scrollbars, move the pointer, and
   * measure (see the file-level test.use); the hidden-table defect on this
   * screen (#201 AC10, above) was likewise invisible to every capture and only
   * surfaced through a number.
   */
  test.describe("#220: the member home's charts hold still", () => {
    // The assertions below are soft: every chart is measured even after one
    // fails, so a failure says whether one chart regressed or both, and whether
    // the loop runs as well as the overflow that starts it.
    const CHARTS = ["Tus últimos 12 meses", "Tus mejores horas para autoconsumir"];

    // A size change reaches a ResizeObserver, and a wheel's scroll reaches
    // scrollTop, within a frame or two of what causes it, so a value that has
    // held this many frames in a row has settled. Counted in frames, so a
    // loaded machine waits longer rather than less. MAX_FRAMES bounds the
    // wait, so a chart that never settles fails on the assertions below rather
    // than on the test timeout.
    const SETTLE_FRAMES = 5;
    const MAX_FRAMES = 120;

    const openMemberHome = async (page: Page) => {
      await injectAuthToken(page);
      await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
      await mockAllApiRoutes(page, FIXED_MEMBER_USER);
      await mockMemberHome(page, FIXED_MEMBER_USER, {
        monthly: MEMBER_MONTHLY_SERIES_GAP_INCOMPLETE,
        hourly: MEMBER_HOURLY_PROFILE_GAPS,
      });
      await page.goto("/home/member");
      // Structural: ApexCharts' SVG has no role or name of its own.
      await expect(page.locator("svg.apexcharts-svg")).toHaveCount(3);
      await stabilizePage(page);
    };

    /**
     * Structural: the scroll container is the chart canvas's nearest
     * horizontally scrolling ancestor, found as #201 AC10 finds it. Tagged so
     * the measurements below can address it.
     */
    const tagScroller = (page: Page, name: string) =>
      page.getByRole("region", { name }).evaluate((region) => {
        let el = region.querySelector(".apexcharts-canvas")?.parentElement ?? null;
        while (el && getComputedStyle(el).overflowX !== "auto") el = el.parentElement;
        el?.setAttribute("data-chart-scroller", "");
        return el !== null;
      });

    /** What a reader would see change: the area's size, each chart's size, and any vertical overflow. */
    const measure = (page: Page, name: string) =>
      page
        .getByRole("region", { name })
        .locator("[data-chart-scroller]")
        .evaluate((scroller: HTMLElement) => ({
          width: scroller.offsetWidth,
          height: scroller.offsetHeight,
          verticalScrollbar: scroller.offsetWidth - scroller.clientWidth,
          verticalOverflow: scroller.scrollHeight - scroller.clientHeight,
          charts: [...scroller.querySelectorAll(".apexcharts-canvas")].map((canvas) => {
            const box = canvas.getBoundingClientRect();
            return { width: box.width, height: box.height };
          }),
        }));

    test("#220 AC1, AC2, AC4: moving the pointer across either chart redraws nothing and resizes nothing", async ({
      page,
    }) => {
      await openMemberHome(page);

      for (const name of CHARTS) {
        expect(await tagScroller(page, name), `${name} has a scroll container`).toBe(true);
        const region = page.getByRole("region", { name });
        await region.scrollIntoViewIfNeeded();

        // Soft, so that a failure here still lets the sweep below report whether the loop runs.
        const settled = await measure(page, name);
        expect.soft(settled.verticalOverflow, `${name}: vertical overflow once settled`).toBe(0);
        expect.soft(settled.verticalScrollbar, `${name}: vertical scrollbar once settled`).toBe(0);

        // Count every size change of the area, the box the charts measure, and
        // each chart; mark each SVG so a redraw, which replaces it, shows.
        await region.locator("[data-chart-scroller]").evaluate(async (scroller) => {
          const watched = [scroller, scroller.firstElementChild!, ...scroller.querySelectorAll(".apexcharts-canvas")];
          const state = { resizes: 0, triggers: 0, ready: false };
          (scroller as unknown as { resizeLog: typeof state }).resizeLog = state;
          // A ResizeObserver reports every observed element once on observe;
          // only what follows is a change.
          new ResizeObserver(() => {
            if (state.ready) state.resizes += 1;
          }).observe(watched[0]);
          watched.slice(1).forEach((el) =>
            new ResizeObserver(() => {
              if (state.ready) state.resizes += 1;
            }).observe(el),
          );
          // What makes ApexCharts redraw, 150 ms later: a size change of its
          // element's parent, or a window resize (_parentResizeCallback and
          // _windowResizeHandler in apexcharts.js). Counted apart from the
          // sizes asserted below, only to know whether a redraw is coming.
          scroller.querySelectorAll(".apexcharts-canvas").forEach((canvas) => {
            const parent = canvas.parentElement?.parentElement;
            if (!parent) return;
            new ResizeObserver(() => {
              if (state.ready) state.triggers += 1;
            }).observe(parent);
          });
          window.addEventListener("resize", () => {
            if (state.ready) state.triggers += 1;
          });
          scroller.querySelectorAll("svg.apexcharts-svg").forEach((svg) => svg.setAttribute("data-drawn-before-sweep", ""));
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
          state.ready = true;
        });

        // Sweep every chart in the area along three rows, measuring at every
        // step: hover chrome only exists while the pointer is on the chart.
        const whileHovering = { verticalOverflow: 0, verticalScrollbar: 0 };
        const canvases = region.locator(".apexcharts-canvas");
        for (let c = 0; c < (await canvases.count()); c++) {
          const box = (await canvases.nth(c).boundingBox())!;
          for (const row of [0.2, 0.6, 0.95]) {
            for (let step = 1; step < 24; step++) {
              await page.mouse.move(box.x + (box.width * step) / 24, box.y + box.height * row);
              const during = await measure(page, name);
              whileHovering.verticalOverflow = Math.max(whileHovering.verticalOverflow, during.verticalOverflow);
              whileHovering.verticalScrollbar = Math.max(whileHovering.verticalScrollbar, during.verticalScrollbar);
            }
          }
        }
        // Wait for the last move's size changes, if any, to stop.
        const triggered = await region.locator("[data-chart-scroller]").evaluate(
          async (scroller, { settleFrames, maxFrames }) => {
            const log = (scroller as unknown as { resizeLog: { resizes: number; triggers: number } }).resizeLog;
            const count = () => log.resizes + log.triggers;
            let last = count();
            let held = 0;
            for (let frame = 0; frame < maxFrames && held < settleFrames; frame++) {
              await new Promise((resolve) => requestAnimationFrame(resolve));
              held = count() === last ? held + 1 : 0;
              last = count();
            }
            return log.triggers > 0;
          },
          { settleFrames: SETTLE_FRAMES, maxFrames: MAX_FRAMES },
        );
        // With no trigger there is no redraw to wait for. With one, wait for
        // the redraw it scheduled, so the assertions below see it.
        if (triggered) {
          await expect
            .soft(
              region.locator("svg.apexcharts-svg:not([data-drawn-before-sweep])"),
              `${name}: the redraw ApexCharts schedules after its parent or the window resized`,
            )
            .not.toHaveCount(0);
        }

        expect
          .soft(whileHovering, `${name}: the most vertical overflow and scrollbar seen while hovering`)
          .toEqual({ verticalOverflow: 0, verticalScrollbar: 0 });
        expect.soft(await measure(page, name), `${name}: dimensions after the sweep`).toEqual(settled);
        const after = await region.locator("[data-chart-scroller]").evaluate((scroller) => ({
          resizes: (scroller as unknown as { resizeLog: { resizes: number } }).resizeLog.resizes,
          redrawn: scroller.querySelectorAll("svg.apexcharts-svg:not([data-drawn-before-sweep])").length,
        }));
        expect.soft(after, `${name}: size changes and redraws during the sweep`).toEqual({ resizes: 0, redrawn: 0 });

        await page.mouse.move(0, 0);
      }
    });

    test("#220 AC1: the chart containers cannot scroll vertically, even when something reaches below them", async ({ page }) => {
      await openMemberHome(page);

      for (const name of CHARTS) {
        expect(await tagScroller(page, name), `${name} has a scroll container`).toBe(true);
        const scroller = page.getByRole("region", { name }).locator("[data-chart-scroller]");
        await scroller.scrollIntoViewIfNeeded();
        await page.mouse.move(0, 0);
        const widthBefore = await scroller.evaluate((el) => el.clientWidth);

        // Overflow it on purpose, the way the hover chrome did: something
        // positioned inside a chart that reaches below the area. What the area
        // does with that decides whether a future overflow can start the loop.
        await scroller.evaluate((el) => {
          const probe = document.createElement("div");
          probe.setAttribute("data-overflow-probe", "");
          Object.assign(probe.style, { position: "absolute", left: "0", top: "100%", width: "1px", height: `${el.clientHeight}px` });
          el.querySelector(".apexcharts-canvas")!.appendChild(probe);
        });
        const box = (await scroller.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        // The wheel resolves before the scroll it causes is applied: wait for
        // the container to receive it, then for its scroll position to hold.
        await scroller.evaluate((el) => {
          (el as unknown as { wheelSeen: Promise<void> }).wheelSeen = new Promise((resolve) =>
            el.addEventListener("wheel", () => resolve(), { once: true, passive: true }),
          );
        });
        await page.mouse.wheel(0, 200);
        await scroller.evaluate(
          async (el, { settleFrames, maxFrames }) => {
            const nextFrame = () => new Promise((resolve) => requestAnimationFrame(resolve));
            let seen = false;
            void (el as unknown as { wheelSeen: Promise<void> }).wheelSeen.then(() => (seen = true));
            for (let frame = 0; frame < maxFrames && !seen; frame++) await nextFrame();
            let last = el.scrollTop;
            let held = 0;
            for (let frame = 0; frame < maxFrames && held < settleFrames; frame++) {
              await nextFrame();
              held = el.scrollTop === last ? held + 1 : 0;
              last = el.scrollTop;
            }
          },
          { settleFrames: SETTLE_FRAMES, maxFrames: MAX_FRAMES },
        );

        const overflowed = await scroller.evaluate((el: HTMLElement) => ({
          scrollTop: el.scrollTop,
          verticalScrollbar: el.offsetWidth - el.clientWidth,
          clientWidth: el.clientWidth,
        }));
        expect.soft(overflowed, `${name} with content reaching below it`).toEqual({
          scrollTop: 0,
          verticalScrollbar: 0,
          clientWidth: widthBefore,
        });

        await scroller.evaluate((el) => el.querySelector("[data-overflow-probe]")!.remove());
      }
    });

    test("#220 AC3: at 390px the charts still scroll sideways inside their containers, and the page does not", async ({
      page,
    }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "AC3 is specified against a 390px viewport.");

      await openMemberHome(page);

      for (const name of CHARTS) {
        expect(await tagScroller(page, name), `${name} has a scroll container`).toBe(true);
        const scroller = page.getByRole("region", { name }).locator("[data-chart-scroller]");
        await scroller.scrollIntoViewIfNeeded();

        const box = (await scroller.boundingBox())!;
        await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
        await page.mouse.wheel(200, 0);

        await expect
          .poll(() => scroller.evaluate((el) => el.scrollLeft), { message: `${name} scrolls sideways` })
          .toBeGreaterThan(0);
        expect(
          await page.evaluate(() => ({ scrollX: window.scrollX, document: document.documentElement.scrollWidth })),
          `the page beside ${name}`,
        ).toEqual({ scrollX: 0, document: 390 });
      }
    });
  });

  // -------------------------------------------------------------------------
  // Page containers
  // -------------------------------------------------------------------------

  /**
   * Every page that lays its sections out with sxStyles.pageContainerFull, each
   * opened with the persona and mocks of its own capture. /communities/new has
   * no capture; it is opened as the platform admin who creates communities.
   */
  const CONTAINER_PAGES: { name: string; open: (page: Page) => Promise<void> }[] = [
    ...[
      ["/profile", "/profile"],
      ["/change-password", "/change-password"],
    ].map(([name, path]) => ({
      name,
      open: async (page: Page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
        await mockAllApiRoutes(page, FIXED_MEMBER_USER);
        await page.goto(path);
      },
    })),
    ...[
      ["/platform-admins", "/platform-admins"],
      ["/communities", "/communities"],
      ["/communities/new", "/communities/new"],
      ["/communities/:communityId/edit", `/communities/${FIXED_COMMUNITY_ID}/edit`],
      ["/communities/:communityId/admins", `/communities/${FIXED_COMMUNITY_ID}/admins`],
    ].map(([name, path]) => ({
      name,
      open: async (page: Page) => {
        await injectAuthToken(page);
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await mockCommunityAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await mockPlatformAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await page.goto(path);
      },
    })),
    ...(
      [
        ["/members", "/members", mockCommunityManagementRoutes],
        ["/integrations", "/integrations", mockCommunityManagementRoutes],
        ["/supply-points/new", "/supply-points/new"],
        ["/supply-points/:supplyPointId/edit", `/supply-points/${FIXED_SUPPLY_ID}/edit`],
        ["/production/new", "/production/new"],
        [
          "/production/:plantId/edit",
          `/production/${FIXED_PLANT_ID}/edit`,
          (page: Page) => mockPlantDetailRoutes(page, FIXED_COMMUNITY_ADMIN_USER),
        ],
      ] as [string, string, ((page: Page) => Promise<void>)?][]
    ).map(([name, path, mockPageRoutes]) => ({
      name,
      open: async (page: Page) => {
        await injectAuthToken(page);
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockPageRoutes?.(page);
        await page.goto(path);
      },
    })),
  ];

  /**
   * #211 AC1. pageContainerFull pads its sections at phone width, and so do the
   * hero and form panels around and inside it. The padding must sit inside the
   * 100% width, not on top of it. Two places can show the overflow. The document's scroll width catches a page that scrolls
   * sideways. Half of these pages clip their root with overflow:hidden, which
   * keeps the document at 390px while cutting the right edge of every section
   * off, so the page's root box is measured too: its scroll width counts what
   * it clips.
   *
   * Measured on the mobile project, whose emulated scrollbars overlay the
   * content and take no width, as on a phone, even with the real scrollbars
   * this file runs with (see the file-level test.use). The check is mobile-only
   * and says nothing about a desktop scrollbar's width.
   */
  for (const containerPage of CONTAINER_PAGES) {
    test(`#211 AC1: ${containerPage.name} stays within a 390px viewport`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "mobile", "AC1 is specified against a 390px viewport.");

      await containerPage.open(page);
      const heading = page.getByRole("main").getByRole("heading", { level: 1 });
      await expect(heading).toBeVisible();
      await stabilizePage(page);

      const widths = await heading.evaluate((h1) => {
        // Structural: the page's root box is the main region's child that holds
        // the page's heading; it has no role or name of its own.
        let root: HTMLElement = h1 as HTMLElement;
        while (root.parentElement && root.parentElement.id !== "main-content") root = root.parentElement;
        return {
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          rootScroll: root.scrollWidth,
          rootClient: root.clientWidth,
        };
      });
      expect(widths.document, `${containerPage.name} scrolls sideways`).toBeLessThanOrEqual(widths.viewport);
      expect(widths.rootScroll, `${containerPage.name} overflows its root box`).toBeLessThanOrEqual(widths.rootClient);
    });
  }
});

/**
 * #247. The historical analysis page's supply selector at phone width: the
 * trigger and the bottom sheet it opens fit a 390px viewport, the longest
 * option (a long name, a CUPS and the "Punto de planta" tag) wraps instead of
 * widening anything, and the page never scrolls sideways.
 */
test.describe("#247: the historical analysis supply selector", () => {
  const LONG_PLANT_SUPPLY: SupplyResponse = {
    ...FIXED_SUPPLY,
    id: "dddddddd-eeee-ffff-0000-111111111111",
    code: "ES0031300806333002ET0F",
    name: "Cubierta fotovoltaica del polideportivo municipal de Luco de Jiloca",
    plant: { id: FIXED_PLANT_ID, name: "Planta Solar 1" },
  };

  test("UI-HIS-001 at 390px the selector and its bottom sheet fit, and the page never scrolls sideways", async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== "mobile", "The bottom sheet is the selector below sm; the budget is a 390px viewport.");

    await injectAuthToken(page);
    await seedActiveCommunity(page, FIXED_MEMBER_USER.id);
    await mockAllApiRoutes(page, FIXED_MEMBER_USER);
    // Registered after mockAllApiRoutes so it wins: the member's own listing,
    // with a plant supply whose label is longer than a phone is wide.
    await page.route(
      (url) => url.href.includes(`/api/v1/users/${FIXED_MEMBER_USER.id}/supplies`),
      (route) =>
        route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([FIXED_SUPPLY, LONG_PLANT_SUPPLY]) }),
    );
    await page.goto("/historical-analysis");

    const trigger = page.getByRole("button", { name: /^Punto de suministro/ });
    await expect(trigger).toBeVisible();
    await stabilizePage(page);

    const pageWidths = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
    }));
    expect(pageWidths.document, "the page scrolls sideways").toBeLessThanOrEqual(pageWidths.viewport);
    const triggerBox = await trigger.boundingBox();
    expect(triggerBox!.x + triggerBox!.width, "the trigger reaches past the viewport").toBeLessThanOrEqual(390);

    await trigger.click();
    const sheet = page.getByRole("dialog", { name: "Punto de suministro" });
    await expect(sheet).toBeVisible();
    await stabilizePage(page);

    const sheetBox = await sheet.boundingBox();
    expect(sheetBox!.x, "the sheet starts off-screen").toBeGreaterThanOrEqual(0);
    expect(sheetBox!.x + sheetBox!.width, "the sheet is wider than the viewport").toBeLessThanOrEqual(390);
    expect(sheetBox!.y + sheetBox!.height, "the sheet reaches below the viewport").toBeLessThanOrEqual(844);
    const sheetScroll = await sheet.evaluate((element) => ({ scroll: element.scrollWidth, client: element.clientWidth }));
    expect(sheetScroll.scroll, "the sheet scrolls sideways").toBeLessThanOrEqual(sheetScroll.client);

    const radios = sheet.getByRole("radio");
    await expect(radios).toHaveCount(3);
    const longOption = sheet.getByText(LONG_PLANT_SUPPLY.name!, { exact: false });
    const optionBox = await longOption.boundingBox();
    expect(optionBox!.x + optionBox!.width, "the long option is cut off").toBeLessThanOrEqual(sheetBox!.x + sheetBox!.width);
    await expect(sheet.getByText("Punto de planta")).toBeInViewport();
  });
});

/**
 * UI-LST-001. From a 1024px viewport a records list is a table, and with the
 * side menu open no table may scroll sideways: a value that does not fit moves
 * under the name instead. Measured at exactly 1024px, the narrowest viewport
 * that shows the table, on each of the four list pages, with values long
 * enough to need folding. The long values are copies of the shared fixtures,
 * served to these tests alone.
 *
 * Desktop project only: the side menu is persistent from 768px, so it is open
 * at 1024px, and the real scrollbars this file runs with take their width.
 */
test.describe("UI-LST-001 the list tables fit a 1024px viewport with the side menu open", () => {
  const LONG = "Cooperativa Energética Comunitaria de la Vega Baja del Segura y Comarca";
  const longCommunity: CommunityResponse = {
    id: FIXED_COMMUNITY_ID,
    name: LONG,
    code: "COOP-VEGA-BAJA-SEGURA-2026",
    legalId: "F12345678",
    address: "Avenida de la Constitución Española, 1978, Bloque 4, Escalera B, 03300 Orihuela (Alicante)",
    enabled: true,
    adminNames: ["Encarnación Martínez-Albaladejo", "Maximiliano Fernández de Córdoba", "Rosa Activa Gómez"],
    memberCount: 1284,
    supplyPointCount: 12840,
    capabilities: communityCapabilitiesFor(FIXED_PLATFORM_ADMIN_USER),
  };
  const longEmail = "encarnacion.martinez.albaladejo.cooperativa@telefonica-empresas.example";

  /** `minNameWidth`: the narrowest the name column may be on that page; below it, long names are cut. */
  const LIST_TABLES: { name: string; open: (page: Page) => Promise<void>; minNameWidth?: number }[] = [
    {
      name: "/members",
      open: async (page) => {
        await seedActiveCommunity(page, FIXED_COMMUNITY_ADMIN_USER.id);
        await mockAllApiRoutes(page, FIXED_COMMUNITY_ADMIN_USER);
        await mockCommunityManagementRoutes(page, {
          memberships: FIXED_MEMBERSHIPS.map((membership) => ({
            ...membership,
            fullName: `${membership.fullName} ${LONG}`,
            contactEmail: membership.contactEmail && longEmail,
          })),
        });
        await page.goto("/members");
      },
    },
    {
      name: "/communities",
      // Everything that does not fit sits under the name, so the name keeps room to be read.
      minNameWidth: 180,
      open: async (page) => {
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        // Registered last, so it wins for the list itself.
        await page.route(
          (url) => url.pathname === "/api/v1/communities",
          (route) =>
            route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([longCommunity]) }),
        );
        await page.goto("/communities");
      },
    },
    {
      name: "/communities/:communityId/admins",
      open: async (page) => {
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await mockCommunityAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER, {
          admins: FIXED_COMMUNITY_ADMINS.map((admin) => ({
            ...admin,
            fullName: `${admin.fullName} ${LONG}`,
            contactEmail: admin.contactEmail && longEmail,
          })),
        });
        await page.goto(`/communities/${FIXED_COMMUNITY_ID}/admins`);
      },
    },
    {
      name: "/platform-admins",
      open: async (page) => {
        await mockAllApiRoutes(page, FIXED_PLATFORM_ADMIN_USER);
        await mockPlatformAdminsRoutes(page, FIXED_PLATFORM_ADMIN_USER, {
          admins: FIXED_PLATFORM_ADMINS.map((admin) => ({
            ...admin,
            fullName: `${admin.fullName} ${LONG}`,
            email: admin.email && longEmail,
          })),
        });
        await page.goto("/platform-admins");
      },
    },
  ];

  for (const listTable of LIST_TABLES) {
    test(`UI-LST-001 ${listTable.name} shows its table without sideways scroll`, async ({ page }, testInfo) => {
      test.skip(testInfo.project.name !== "desktop", "The side menu is persistent only on the desktop project.");

      await page.setViewportSize({ width: 1024, height: 900 });
      await injectAuthToken(page);
      await listTable.open(page);

      const table = page.getByRole("main").getByRole("table");
      await expect(table).toBeVisible();
      await expect(page.getByRole("navigation", { name: "Navegación principal" })).toBeVisible();
      await stabilizePage(page);

      const widths = await table.evaluate((element) => {
        // Structural: the table's scroll container is MUI's TableContainer, its parent; it has no role.
        const container = element.parentElement as HTMLElement;
        return {
          viewport: document.documentElement.clientWidth,
          document: document.documentElement.scrollWidth,
          containerScroll: container.scrollWidth,
          containerClient: container.clientWidth,
          table: Math.round(element.getBoundingClientRect().width),
          columns: [...element.querySelectorAll("thead th")].map((th) => Math.round(th.getBoundingClientRect().width)),
          // A header or a cell whose content is wider than its column is cut by the fixed layout.
          clipped: [...element.querySelectorAll("th, td")]
            .filter((cell) => cell.scrollWidth > cell.clientWidth)
            .map((cell) => cell.textContent),
        };
      });
      testInfo.annotations.push({ type: "column widths", description: `${listTable.name}: ${widths.columns.join(", ")}` });
      console.log(`UI-LST-001 ${listTable.name}: table ${widths.table}px, columns ${widths.columns.join(", ")}`);

      expect(widths.document, `${listTable.name} scrolls sideways`).toBeLessThanOrEqual(widths.viewport);
      expect(widths.containerScroll, `${listTable.name} table overflows its container`).toBeLessThanOrEqual(
        widths.containerClient,
      );
      expect(widths.clipped, `${listTable.name} cells wider than their column`).toEqual([]);
      if (listTable.minNameWidth) {
        expect(widths.columns[0], `${listTable.name} name column width`).toBeGreaterThanOrEqual(listTable.minNameWidth);
      }
    });
  }
});

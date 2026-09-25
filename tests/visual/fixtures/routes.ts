import type { Page, Route } from "@playwright/test";
import {
  EMPTY_PRODUCTION,
  FIXED_COMMUNITY_ID,
  FIXED_PLANT,
  FIXED_PLANT_ID,
  FIXED_PLANT_WITH_SUPPLY,
  FIXED_SUPPLY,
  FIXED_SUPPLY_2,
  FIXED_SUPPLY_ID,
  PAGED_PLANTS,
  PAGED_SUPPLIES,
  PAGED_USERS,
} from "./data";

// ---------------------------------------------------------------------------
// Helper: set up all API route mocks on a given page
//
// Pass the fixture that should be returned by /api/v1/users/current.
// All other responses are fixture-independent.
// ---------------------------------------------------------------------------

export async function mockAllApiRoutes(page: Page, currentUser: object) {
  // Supply list and supply detail.
  // NOTE: Playwright's glob ** matching is unreliable for patterns like
  // `**/api/v1/**/supplies**`.  Function predicates match reliably and avoid
  // accidentally catching the communities handler.
  const suppliesHandler = async (route: Route) => {
    const url = route.request().url();
    // /supplies/{id}/partition-coefficients (and its /active and /at siblings)
    // sit under the supply URL space, so without this guard they fall through
    // to the branches below and are answered with the supply object or the
    // paged supply list. Either shape crashes the consumer, which expects an
    // array -- and the failure surfaces as a blank section rather than as a
    // mock problem. Any supply id, not just FIXED_SUPPLY_ID: the coefficient
    // rows of an agreement carry their own ids. A test that needs real periods
    // registers mockSupplyPartitionCoefficientRoutes, which wins by being
    // registered later.
    if (url.includes("/partition-coefficients")) {
      return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
    }
    if (url.includes(`/supplies/${FIXED_SUPPLY_ID}`)) {
      if (url.includes("/production/") || url.includes("/consumption/")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(EMPTY_PRODUCTION),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_SUPPLY),
      });
    }
    // User-scoped supplies endpoint (e.g. GET /api/v1/users/{id}/supplies)
    // returns a raw array, not a paged envelope.
    if (url.includes("/api/v1/users/")) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([FIXED_SUPPLY, FIXED_SUPPLY_2]),
      });
    }
    if (
      route.request().method() === "GET" &&
      !url.includes("/import") &&
      !url.includes("/datadis") &&
      !url.includes("/partitions")
    ) {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PAGED_SUPPLIES),
      });
    }
    return route.continue();
  };

  await page.route(
    (url) => url.href.includes("/api/v1/") && url.href.includes("/supplies"),
    suppliesHandler,
  );

  // User list and current user.
  await page.route(
    (url) => url.href.includes("/api/v1/users"),
    async (route: Route) => {
      const url = route.request().url();
      // User-scoped supplies (e.g. /api/v1/users/{id}/supplies) is owned by
      // suppliesHandler. Playwright matches routes in reverse registration order,
      // so this handler is consulted first for that URL; defer to suppliesHandler
      // so it returns the raw supply array instead of the paged-users envelope.
      if (url.includes("/supplies")) {
        return route.fallback();
      }
      // Matches /users/current and /users/{uuid}
      if (url.match(/\/api\/v1\/users\/[a-z0-9-]+$/)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(currentUser),
        });
      }
      if (route.request().method() === "GET") {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(PAGED_USERS),
        });
      }
      return route.continue();
    },
  );

  // Communities (list only — exclude supplies URLs)
  await page.route(
    (url) => url.href.includes("/api/v1/communities") && !url.href.includes("/supplies"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          { id: FIXED_COMMUNITY_ID, name: "Sol Común", code: "SOL", enabled: true },
        ]),
      }),
  );

  // Plants — return empty to avoid loading spinners
  await page.route(
    (url) => url.href.includes("/api/v1/plants"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ items: [], size: 10, totalElements: 0, totalPages: 0, number: 0 }),
      }),
  );

  await page.route(
    (url) => url.href.includes("/api/v1/sharing-agreements"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      }),
  );

  await page.route(
    (url) => url.href.includes("/api/v1/info"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ version: "1.0.0-test" }),
      }),
  );
}

// ---------------------------------------------------------------------------
// Helper: override the plants/sharing-agreements routes for a specific plant.
// Registered AFTER mockAllApiRoutes() so it takes precedence (Playwright
// matches routes in reverse registration order) — mockAllApiRoutes's broad
// communities/plants mocks would otherwise return an empty list for these
// exact URLs.
// ---------------------------------------------------------------------------

export async function mockSharingAgreementsPlantRoutes(page: Page, agreements: unknown[]) {
  await page.route(
    (url) => url.href.includes(`/api/v1/communities/${FIXED_COMMUNITY_ID}/plants`),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(PAGED_PLANTS),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}`) && !url.href.includes("sharing-agreements"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_PLANT),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements`),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(agreements),
      }),
  );
}

// ---------------------------------------------------------------------------
// Helper: the plant detail page's own plant. Registered AFTER mockAllApiRoutes()
// so it wins over that file's broad, deliberately-empty /plants mock.
// ---------------------------------------------------------------------------

export async function mockPlantDetailRoutes(page: Page) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}`) && !url.href.includes("sharing-agreements"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(FIXED_PLANT_WITH_SUPPLY),
      }),
  );
}

/**
 * Serves the supply coefficient history, honouring the optional plantId filter
 * exactly as the backend does -- the drawer passes it and must come back with a
 * single plant's timeline, the supply detail page omits it and gets both.
 *
 * Registered AFTER mockAllApiRoutes() so it wins: Playwright matches routes in
 * reverse registration order.
 */
export async function mockSupplyPartitionCoefficientRoutes(page: Page, periods: unknown[]) {
  await page.route(
    (url) => /\/api\/v1\/supplies\/[^/]+\/partition-coefficients/.test(url.href),
    (route: Route) => {
      const plantId = new URL(route.request().url()).searchParams.get("plantId");
      const body = plantId
        ? (periods as { plant: { id: string } }[]).filter((period) => period.plant.id === plantId)
        : periods;
      return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
    },
  );
}

// ---------------------------------------------------------------------------
// Helper: override the single-agreement, partition-coefficients and file
// routes for one agreement. Registered AFTER mockSharingAgreementsPlantRoutes()
// so its more specific predicates win (Playwright matches routes in reverse
// registration order) — the broad `/plants/{id}/sharing-agreements` route
// registered there would otherwise return the plain list for these URLs too.
// ---------------------------------------------------------------------------

// `fileStatus` controls only the response to a Descargar click (GET .../file)
// — the file panel's displayed state (filename/date vs. empty-state copy)
// comes from `agreement.file` itself, read directly off the `agreement`
// fixture passed in above, never from probing this route.
export async function mockSharingAgreementDetailRoutes(
  page: Page,
  agreementId: string,
  agreement: unknown,
  coefficients: unknown[],
  fileStatus: 200 | 404 = 404,
) {
  await page.route(
    (url) =>
      url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements/${agreementId}`) &&
      !url.href.includes("/partition-coefficients") &&
      !url.href.includes("/file"),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(agreement),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements/${agreementId}/partition-coefficients`),
    (route: Route) =>
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(coefficients),
      }),
  );

  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${FIXED_PLANT_ID}/sharing-agreements/${agreementId}/file`),
    (route: Route) =>
      fileStatus === 404
        ? route.fulfill({ status: 404, contentType: "application/json", body: JSON.stringify({}) })
        : route.fulfill({ status: 200, contentType: "application/octet-stream", body: "fake-file-bytes" }),
  );
}

// ---------------------------------------------------------------------------
// Helper: override the file route's POST with a 400 rejection carrying both a
// file-level and a line-level error. Registered AFTER
// mockSharingAgreementDetailRoutes() so it wins for POST while GET still
// falls through (via route.fallback()) to that helper's 404/200 GET mock.
// ---------------------------------------------------------------------------

export async function mockSharingAgreementFileUploadRejection(page: Page, plantId: string, agreementId: string) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${plantId}/sharing-agreements/${agreementId}/file`),
    (route: Route) => {
      if (route.request().method() !== "POST") return route.fallback();
      return route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          errors: [
            { message: "Coefficient sum invalid", code: "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID" },
            {
              message: "Unknown CUPS",
              code: "DISTRIBUTOR_FILE_CUPS_UNKNOWN",
              params: { line: "3", cups: "ES0031300000000099ZZ" },
            },
          ],
        }),
      });
    },
  );
}

// ---------------------------------------------------------------------------
// Helper: mock the generate-file POST as a successful binary download.
// Registered AFTER mockSharingAgreementDetailRoutes() for the same
// GET-falls-through-via-route.fallback() reason as the upload-rejection helper.
// ---------------------------------------------------------------------------

export async function mockSharingAgreementGenerateFile(page: Page, plantId: string, agreementId: string) {
  await page.route(
    (url) => url.href.includes(`/api/v1/plants/${plantId}/sharing-agreements/${agreementId}/generate-file`),
    (route: Route) =>
      route.fulfill({ status: 200, contentType: "application/octet-stream", body: "fake-generated-file-bytes" }),
  );
}

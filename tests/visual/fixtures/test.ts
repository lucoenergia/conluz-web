import { test as base, expect, type Page, type Request, type Response } from "@playwright/test";
import { ROUTE_MOUNT_TIMEOUT_MS } from "./session";

/**
 * `test`, extended so that no screen may ask the backend something it refuses.
 *
 * This is the only check in the suite that catches the epic's original defect in
 * general form -- a control offered to somebody the backend will turn away --
 * without writing an assertion per control. Every other test asserts what a
 * screen shows; this one asserts what it *asks for*, across every navigation a
 * test makes, for free.
 *
 * It only means something because the route mocks now answer 403 for a caller
 * whose served capabilities say no (see ./routes.ts). While they answered 200
 * to everybody, a listener like this would have passed vacuously.
 *
 * The assertion runs AFTER the test body, which is the point: a denial nothing
 * awaited -- a fire-and-forget query whose failure lands in React Query's error
 * state and never reaches the screen -- still fails the test. Checking inline
 * would only catch the ones a test happened to look at.
 */

/** A denial the app is right to provoke, keyed on method, path shape and status. */
interface AllowedDenial {
  method: string;
  path: RegExp;
  status: number;
  /** Why asking is correct even though the answer is no. */
  reason: string;
}

export const ALLOWED_DENIALS: AllowedDenial[] = [
  {
    method: "GET",
    path: /\/api\/v1\/plants\/[^/]+\/sharing-agreements\/[^/]+\/file$/,
    status: 404,
    reason:
      "whether an agreement has an uploaded distributor file is a question only this endpoint " +
      "answers, and 404 is the answer 'none yet' -- the file panel renders its empty state from it. " +
      "mockSharingAgreementDetailRoutes takes fileStatus for exactly this.",
  },
  {
    method: "GET",
    path: /\/api\/v1\/plants\/[^/]+\/production\/huawei\/config$/,
    status: 404,
    reason:
      "whether a plant has a Huawei configuration is a question only this endpoint answers, and 404 " +
      "is the answer 'not configured yet' -- the plant integrations section renders its empty state " +
      "from it (UI-INT-007). mockHuaweiConfigRoutes takes config: null for exactly this.",
  },
  {
    method: "GET",
    path: /\/api\/v1\/communities\/[^/]+\/config\/datadis$/,
    status: 404,
    reason:
      "whether a community has a Datadis configuration is a question only this endpoint answers, and " +
      "404 is the answer 'not configured yet' -- the Datadis card renders its create form, with no " +
      "switch, from it (UI-INT-014). mockDatadisConfigRoutes takes config: null for exactly this.",
  },
  {
    method: "POST",
    path: /\/api\/v1\/users\/current\/invitations\/accept$/,
    status: 403,
    reason:
      "a caller who must change their password is answered 403 USER_PASSWORD_CHANGE_REQUIRED, and " +
      "the accept-invitation screen renders its password-change state from exactly that answer " +
      "(UI-INV-013); accept-invitation.spec.ts serves it on purpose.",
  },
];

/**
 * Exposed for the canary in denied-calls.spec.ts, which asserts this still
 * reports a refusal. A listener nobody checks is a listener that can be
 * disabled by accident and never noticed.
 */
export function classifyDenial(method: string, path: string, status: number): AllowedDenial | undefined {
  return ALLOWED_DENIALS.find(
    (entry) => entry.method === method && entry.status === status && entry.path.test(path),
  );
}

export function isReportable(method: string, path: string, status: number): boolean {
  if (status !== 403 && status !== 404) return false;
  if (!path.includes("/api/v1/")) return false;
  return classifyDenial(method, path, status) === undefined;
}

/** Exposed so a test can assert that the listener itself still fires. */
export function describeDenial(response: Response): string {
  return `${response.request().method()} ${new URL(response.url()).pathname} -> ${response.status()}`;
}

/** Frames in a row with nothing loading before a page counts as settled. */
const SETTLED_FRAMES = 5;

/** Each page's requests still in flight, recorded by the settledAfterGoto fixture. */
const requestsInFlight = new WeakMap<Page, Set<Request>>();

/**
 * Waits until the page has settled: the app has rendered, no route fallback is
 * showing, and no request is in flight, held for SETTLED_FRAMES animation frames
 * in a row, because a commit is what starts the next request. `page.goto` runs
 * it after every navigation; a helper whose click navigates calls it itself.
 */
export async function waitForPageSettled(page: Page) {
  const inFlight = requestsInFlight.get(page);
  if (!inFlight) {
    throw new Error("waitForPageSettled needs the page of a test from ./fixtures, which records its requests.");
  }
  // The route fallback, found as waitForRouteMounted finds it.
  const routeFallback = page.getByRole("status").filter({ has: page.getByRole("progressbar") });
  const rendered = page.locator("#root > *");
  const deadline = Date.now() + ROUTE_MOUNT_TIMEOUT_MS;
  let quietFrames = 0;
  while (quietFrames < SETTLED_FRAMES) {
    if (Date.now() > deadline) {
      const pending = [...inFlight].map((request) => `${request.method()} ${new URL(request.url()).pathname}`);
      throw new Error(
        `The page did not settle within ${ROUTE_MOUNT_TIMEOUT_MS} ms. ` +
          `Still loading: ${pending.join(", ") || "nothing in flight, but the app has not rendered or shows the route fallback"}.`,
      );
    }
    await page.evaluate(() => new Promise((resolve) => requestAnimationFrame(resolve)));
    const settled = inFlight.size === 0 && (await rendered.count()) > 0 && (await routeFallback.count()) === 0;
    quietFrames = settled ? quietFrames + 1 : 0;
  }
}

export const test = base.extend<{ noDeniedCalls: void; settledAfterGoto: void }>({
  // `auto` rather than a fixture a test asks for, and rather than overriding
  // `page`: a spec gets the check by importing `test` from ./fixtures and
  // nothing else. An opt-in fixture would be missing from exactly the specs
  // nobody remembered to opt into, and overriding `page` while depending on it
  // is circular.
  noDeniedCalls: [
    async ({ page }: { page: Page }, use) => {
      const denied: string[] = [];

      page.on("response", (response) => {
        if (!isReportable(response.request().method(), new URL(response.url()).pathname, response.status())) {
          return;
        }
        denied.push(describeDenial(response));
      });

      await use();

      expect(
        denied,
        "A screen asked the backend for something it refuses. Either the control should not have " +
          "been offered to this caller -- gate it on the capability the backend answers with -- or " +
          "the request is legitimate and belongs in ALLOWED_DENIALS with the reason why.",
      ).toEqual([]);
    },
    { auto: true },
  ],

  // `goto` resolves on the load event, long before a screen has content: every
  // page is React.lazy, CapabilityRoute renders nothing until the capability
  // answer arrives, and only then is the page's chunk requested -- hundreds of
  // unbundled modules on the dev server, then the screen's own reads. Neither
  // the route fallback nor `networkidle` spans all of that (see
  // waitForRouteMounted). On a busy machine the chain outlasts a test's first
  // assertion, which then times out on content that was still on its way.
  //
  // So every navigation waits for the page to settle (waitForPageSettled).
  // Patched on the instance because a fixture cannot override `page` while
  // depending on it (see above).
  settledAfterGoto: [
    async ({ page }: { page: Page }, use) => {
      const inFlight = new Set<Request>();
      requestsInFlight.set(page, inFlight);
      page.on("request", (request) => inFlight.add(request));
      page.on("requestfinished", (request) => inFlight.delete(request));
      page.on("requestfailed", (request) => inFlight.delete(request));

      const goto = page.goto.bind(page);
      page.goto = async (url, options) => {
        const response = await goto(url, options);
        await waitForPageSettled(page);
        return response;
      };
      await use();
    },
    { auto: true },
  ],
});

export { expect };

import { test as base, expect, type Page, type Response } from "@playwright/test";

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

export const test = base.extend<{ noDeniedCalls: void }>({
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
});

export { expect };

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

/**
 * A user-scoped listing is scoped to the CALLER, not to the community on screen.
 *
 * `GET /users/{userId}/supplies` answers with the supplies the caller may read
 * one by one -- all of the target's for the target themselves, otherwise those
 * in the communities the caller administers (conluz#326). That is an
 * authorization answer, and it is plural: somebody administering two
 * communities receives both communities' rows, while the selector names one.
 *
 * So every screen reading one of these has to narrow it to the active community
 * itself. Nothing in the endpoint, the query key or the capability says which
 * community is on screen -- `canListSupplies` predicts whether the call is
 * allowed, never what it returns -- so this is the client's job and only the
 * client's.
 *
 * This spec makes that a standing rule rather than a thing somebody remembered
 * once. A new call site fails until it declares the filter it applies.
 */

const SPEC_PATH = "api-docs.json";
const GENERATED_CLIENT_DIR = "src/api";
const SOURCE_DIR = "src";

/**
 * Call sites of a user-scoped listing, each with the filter it narrows the
 * response through.
 *
 * The pair is what is frozen, not the file: recording a path alone would exempt
 * it for every user-scoped listing it ever grows, and a second one added
 * tomorrow would inherit an entry nobody re-read.
 */
const USER_SCOPED_LISTINGS: Record<string, { hook: string; filter: string; reason: string }[]> = {
  "src/pages/supply-points/SupplyPointsPage.tsx": [
    {
      hook: "useGetSuppliesByUserId",
      filter: "isSupplyOutsideActiveCommunity",
      reason:
        "the ?personId= branch, reached from the members screen. An admin of two communities " +
        "viewing a member of both receives both communities' supplies; only the active one belongs " +
        "under this page's heading.",
    },
  ],
  "src/context/community.context.tsx": [
    {
      hook: "useGetSuppliesByUserId",
      filter: "pickFirstTimeCommunity",
      reason:
        "decides which community a caller with several enters on when nothing valid is remembered " +
        "(#237). It reads across communities on purpose -- there is no active one yet -- and counts a " +
        "supply only when its community is one of the caller's memberships.",
    },
  ],
  "src/pages/home/useHomeViews.ts": [
    {
      hook: "useGetSuppliesByUserId",
      filter: "isSupplyOutsideActiveCommunity",
      reason:
        "decides whether a community admin owns supplies in the active community, which is what " +
        "offers them the member home view. The caller's own listing spans every community they " +
        "belong to, so a supply in another one must not count here.",
    },
  ],
};

/** Hook names for every GET under /users/{userId}/ that answers with a collection. */
function userScopedListingHooks(): string[] {
  const spec = JSON.parse(readFileSync(SPEC_PATH, "utf8")) as {
    paths: Record<string, Record<string, { operationId?: string; responses?: Record<string, unknown> }>>;
  };

  return Object.entries(spec.paths)
    .filter(([path]) => /^\/api\/v1\/users\/\{userId\}\//.test(path))
    .flatMap(([, operations]) => {
      const get = operations.get;
      if (!get?.operationId) return [];
      const responses = get.responses as
        | Record<string, { content?: Record<string, { schema?: { type?: string } }> }>
        | undefined;
      const content = responses?.["200"]?.content ?? {};
      const isCollection = Object.values(content).some((entry) => entry.schema?.type === "array");
      return isCollection ? [`use${get.operationId[0].toUpperCase()}${get.operationId.slice(1)}`] : [];
    });
}

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return path.startsWith(GENERATED_CLIENT_DIR) ? [] : sourceFiles(path);
    return /\.tsx?$/.test(entry.name) && !/\.spec\.tsx?$/.test(entry.name) ? [path] : [];
  });
}

describe("user-scoped listings are narrowed to the active community", () => {
  const hooks = userScopedListingHooks();

  // If the derivation stops matching, every assertion below passes over an
  // empty list and this spec silently guarantees nothing.
  it("finds the user-scoped listings in the API spec", () => {
    expect(hooks, "No user-scoped collection endpoint found under /users/{userId}/").not.toEqual([]);
    expect(hooks).toContain("useGetSuppliesByUserId");
  });

  it("declares a filter for every call site", () => {
    const undeclared = sourceFiles(SOURCE_DIR).flatMap((file) => {
      const source = readFileSync(file, "utf8");
      const used = hooks.filter((hook) => new RegExp(`\\b${hook}\\b`).test(source));
      if (used.length === 0) return [];
      const declared = (USER_SCOPED_LISTINGS[file] ?? []).map((entry) => entry.hook);
      return used.filter((hook) => !declared.includes(hook)).map((hook) => `${file}: ${hook}`);
    });

    expect(
      undeclared,
      "A screen reads a user-scoped listing without declaring how it narrows the response to the " +
        "active community. These endpoints are scoped to what the caller may read, which spans " +
        "every community they administer -- so the rows must be filtered before they are shown " +
        "under one community's heading. Add the call site to USER_SCOPED_LISTINGS with the filter " +
        "it applies.",
    ).toEqual([]);
  });

  it("keeps no entry for a call site that is gone", () => {
    const stale = Object.entries(USER_SCOPED_LISTINGS).flatMap(([file, entries]) => {
      if (!existsSync(file)) return [`${file} (no such file)`];
      const source = readFileSync(file, "utf8");
      return entries
        .filter((entry) => !new RegExp(`\\b${entry.hook}\\b`).test(source))
        .map((entry) => `${file}: ${entry.hook} (no longer read here)`);
    });

    expect(stale, "These declarations no longer describe the code").toEqual([]);
  });

  it("names a filter the call site actually applies", () => {
    const missing = Object.entries(USER_SCOPED_LISTINGS).flatMap(([file, entries]) => {
      if (!existsSync(file)) return [];
      const source = readFileSync(file, "utf8");
      return entries
        .filter((entry) => !new RegExp(`\\b${entry.filter}\\b`).test(source))
        .map((entry) => `${file}: declares ${entry.filter}, which does not appear there`);
    });

    expect(
      missing,
      "A declared filter has to be the one the file applies, or this list records an intention " +
        "rather than the code.",
    ).toEqual([]);
  });

  it("says why each call site needs narrowing at all", () => {
    const unexplained = Object.entries(USER_SCOPED_LISTINGS).flatMap(([file, entries]) =>
      entries.filter((entry) => entry.reason.trim().length < 40).map((entry) => `${file}: ${entry.hook}`),
    );
    expect(unexplained, "Each entry needs a reason that survives reading").toEqual([]);
  });
});

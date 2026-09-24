import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * Every endpoint this app calls is scoped to a community somehow -- or is
 * deliberately not. This spec forces that decision to be made explicitly,
 * because the failure it guards against is silent: a screen that keeps showing,
 * or writing to, a community the user has navigated away from.
 *
 * The source of truth is api-docs.json, the OpenAPI spec the Orval client is
 * generated from. The client under src/api is cross-checked against it rather
 * than parsed as an alternative truth, so the two drifting apart also fails.
 */

const SPEC_PATH = "api-docs.json";
const GENERATED_CLIENT_DIR = "src/api";

type Scope =
  /** communityId in the URL path -- re-keys by itself when the community changes. */
  | "community-path"
  /**
   * communityId as a QUERY parameter. The dangerous one: it is optional in the
   * schema, so omitting it compiles, type-checks and silently lets the backend
   * pick the target community.
   */
  | "community-query"
  /**
   * Scoped to an entity id, with the community left implicit. Authorised on
   * membership, so it answers for any of the user's communities regardless of
   * which one is selected -- and its query key cannot change when the selection
   * does. Must be reached through a wrapper that applies the community guard
   * (see the no-restricted-imports rule in eslint.config.js).
   */
  | "entity"
  /** Scoped to a user, independent of any community. */
  | "user"
  /** Genuinely community-agnostic: auth, platform administration, reference data. */
  | "global";

/**
 * Paths whose scope cannot be read off their shape. Anything not matched by the
 * structural rules below must be listed here, so a newly generated endpoint
 * fails this spec until somebody has decided what it is.
 */
const REVIEWED: Record<string, Scope> = {
  "/api/v1/communities": "global",
  "/api/v1/info": "global",
  "/api/v1/init": "global",
  "/api/v1/login": "global",
  "/api/v1/logout": "global",
  "/api/v1/prices": "global",
  "/api/v1/plants": "global",
  "/api/v1/supplies": "global",
  "/api/v1/users": "global",
  "/api/v1/supplies/import": "community-query",
  "/api/v1/users/import": "community-query",
};

function structuralScope(path: string): Scope | null {
  if (path.startsWith("/api/v1/communities/{communityId}")) return "community-path";
  if (path.startsWith("/api/v1/plants/{plantId}")) return "entity";
  if (path.startsWith("/api/v1/supplies/{supplyId}")) return "entity";
  if (path.startsWith("/api/v1/users/{userId}")) return "user";
  if (path === "/api/v1/users/current") return "user";
  return null;
}

function classify(path: string): Scope | undefined {
  return structuralScope(path) ?? REVIEWED[path];
}

function readSpecPaths(): Record<string, Record<string, { parameters?: { name: string; in: string }[] }>> {
  return JSON.parse(readFileSync(SPEC_PATH, "utf8")).paths;
}

function collectGeneratedUrls(): Set<string> {
  const urls = new Set<string>();
  for (const tag of readdirSync(GENERATED_CLIENT_DIR, { withFileTypes: true })) {
    if (!tag.isDirectory()) continue;
    for (const file of readdirSync(join(GENERATED_CLIENT_DIR, tag.name))) {
      if (!file.endsWith(".ts")) continue;
      const source = readFileSync(join(GENERATED_CLIENT_DIR, tag.name, file), "utf8");
      for (const [, template] of source.matchAll(/url:\s*`([^`]+)`/g)) {
        urls.add(template.replace(/\$\{([A-Za-z0-9_]+)\}/g, "{$1}"));
      }
    }
  }
  return urls;
}

describe("endpoint community scoping", () => {
  const specPaths = readSpecPaths();

  it("classifies every endpoint in the API spec", () => {
    const unclassified = Object.keys(specPaths).filter((path) => classify(path) === undefined);

    expect(
      unclassified,
      "New endpoints must be classified. If it is scoped by a communityId in the path, in a query " +
        "parameter, by an entity id, by a user, or by nothing at all, say so in REVIEWED above -- " +
        "and if it is entity-scoped, give it a wrapper that applies the community guard.",
    ).toEqual([]);
  });

  it("keeps no stale entries in the reviewed list", () => {
    const stale = Object.keys(REVIEWED).filter((path) => !(path in specPaths));
    expect(stale, "These paths no longer exist in api-docs.json").toEqual([]);
  });

  // The category that caused the bulk-import bug: communityId is optional in the
  // schema, so leaving it out is invisible until the rows land in the wrong
  // community. Any new one has to be noticed here.
  it("knows exactly which endpoints take communityId as a query parameter", () => {
    const byQuery = Object.entries(specPaths)
      .filter(([, operations]) =>
        Object.values(operations).some((operation) =>
          (operation.parameters ?? []).some((p) => p.name === "communityId" && p.in === "query"),
        ),
      )
      .map(([path]) => path)
      .sort();

    const declared = Object.entries(REVIEWED)
      .filter(([, scope]) => scope === "community-query")
      .map(([path]) => path)
      .sort();

    expect(byQuery).toEqual(declared);
  });

  it("stays in step with the generated client", () => {
    const generated = collectGeneratedUrls();
    const spec = new Set(Object.keys(specPaths));

    expect(
      [...generated].filter((url) => !spec.has(url)).sort(),
      "The generated client calls URLs that api-docs.json does not describe",
    ).toEqual([]);
    expect(
      [...spec].filter((path) => !generated.has(path)).sort(),
      "api-docs.json describes endpoints the generated client does not call -- regenerate it",
    ).toEqual([]);
  });
});

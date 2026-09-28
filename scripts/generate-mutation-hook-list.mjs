/**
 * Derives the list of generated mutation hook names from the OpenAPI spec.
 *
 * The list feeds the mutation guard rail in eslint.config.js, which is what
 * keeps a generated mutation hook from being imported next to a button with
 * nobody having decided who may press it. Deriving it from api-docs.json rather
 * than from a naming convention is what keeps it correct when an endpoint is
 * added: regenerating the client refreshes the list, so a new endpoint is
 * restricted the day it is generated rather than the day somebody notices.
 *
 * Run from orval's hooks.afterAllFilesWrite, and standalone as
 * `npm run generate-mutation-hook-list`. Orval swallows a failing hook (it
 * catches and logs rather than failing the run), so this script refusing to
 * write is not enough on its own -- src/contracts/mutationHooks.spec.ts
 * re-derives everything in CI and is the actual enforcement.
 */
import { readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { kebab } from "@orval/core";

const SPEC_PATH = "api-docs.json";
const GENERATED_CLIENT_DIR = "src/api";
const OUTPUT_PATH = "src/contracts/generatedMutationHooks.json";

/** Orval generates a hook per non-GET operation; GET becomes a query hook. */
const MUTATION_METHODS = ["post", "put", "patch", "delete"];

/**
 * The name Orval gives an operation's hook.
 *
 * Orval camel-cases the operationId and prefixes `use`. Every operationId in
 * this spec is already lower camel case, so capitalising the first character is
 * the whole transformation -- but only while that holds, which is why the shape
 * is asserted rather than assumed. A hyphenated or snake_case id would produce a
 * name Orval never generated, and the failure would otherwise surface much later
 * as a lint rule quietly protecting a symbol that does not exist.
 */
const OPERATION_ID_SHAPE = /^[a-z][A-Za-z0-9]*$/;

function hookNameFor(operationId) {
  return `use${operationId[0].toUpperCase()}${operationId.slice(1)}`;
}

function die(message) {
  console.error(`generate-mutation-hook-list: ${message}`);
  process.exit(1);
}

/** Every non-GET operation in the spec, grouped by the module Orval writes it to. */
function readSpec() {
  if (!existsSync(SPEC_PATH)) die(`${SPEC_PATH} not found. Run from the repository root.`);

  const { paths } = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
  const byTag = new Map();
  const seen = new Map();

  for (const [path, operations] of Object.entries(paths)) {
    for (const [method, operation] of Object.entries(operations)) {
      if (!MUTATION_METHODS.includes(method)) continue;

      const { operationId, tags } = operation;
      if (!operationId) die(`${method.toUpperCase()} ${path} has no operationId.`);
      if (!OPERATION_ID_SHAPE.test(operationId)) {
        die(
          `operationId "${operationId}" (${method.toUpperCase()} ${path}) is not lower camel case. ` +
            `The hook name is derived as "use" + the id with its first letter capitalised, which ` +
            `would not match what Orval generates. Teach this script the new shape before regenerating.`,
        );
      }
      if (seen.has(operationId)) {
        die(`operationId "${operationId}" is used by both ${seen.get(operationId)} and ${method.toUpperCase()} ${path}.`);
      }
      seen.set(operationId, `${method.toUpperCase()} ${path}`);

      const tag = tags?.[0];
      if (!tag) die(`${method.toUpperCase()} ${path} has no tag, so Orval has no module to write it to.`);

      if (!byTag.has(tag)) byTag.set(tag, []);
      byTag.get(tag).push(hookNameFor(operationId));
    }
  }

  return [...byTag.entries()]
    .map(([tag, hooks]) => ({
      tag,
      // tags-split names the folder and the file after the kebab-cased tag.
      // Borrowed from Orval itself so the mapping cannot drift from the generator's.
      module: `${GENERATED_CLIENT_DIR}/${kebab(tag)}/${kebab(tag)}`,
      hooks: hooks.sort(),
    }))
    .sort((a, b) => a.module.localeCompare(b.module));
}

/**
 * Every mutation hook the client actually exports.
 *
 * Orval emits mutations as `export const useX = … useMutation(…)` and queries as
 * `export function useGetX`, so the `const` form plus a useMutation call in the
 * body separates the two without parsing TypeScript.
 */
function readGeneratedClient() {
  const hooks = new Set();

  for (const tag of readdirSync(GENERATED_CLIENT_DIR, { withFileTypes: true })) {
    if (!tag.isDirectory()) continue;
    for (const file of readdirSync(join(GENERATED_CLIENT_DIR, tag.name))) {
      if (!file.endsWith(".ts")) continue;
      const source = readFileSync(join(GENERATED_CLIENT_DIR, tag.name, file), "utf8");
      for (const match of source.matchAll(/export const (use[A-Z]\w*)\s*=/g)) {
        // The declaration's body, far enough to cover the longest generated hook.
        if (/useMutation/.test(source.slice(match.index, match.index + 1500))) hooks.add(match[1]);
      }
    }
  }

  return hooks;
}

/**
 * Refuse to describe a client that is not on disk.
 *
 * Writing a list the client does not match would generate a lint rule
 * protecting names that do not exist, and leaving real ones unprotected. Either
 * direction means the spec and the client have drifted, and picking a winner
 * here would hide that.
 */
function crossCheck(modules) {
  const fromSpec = new Set(modules.flatMap(({ hooks }) => hooks));
  const fromClient = readGeneratedClient();

  const missing = [...fromSpec].filter((hook) => !fromClient.has(hook)).sort();
  const extra = [...fromClient].filter((hook) => !fromSpec.has(hook)).sort();

  if (missing.length || extra.length) {
    die(
      `${SPEC_PATH} and ${GENERATED_CLIENT_DIR} disagree. Regenerate the client (npm run generate-client) ` +
        `so the two describe the same API, then run this again.\n` +
        (missing.length ? `  in the spec but not generated: ${missing.join(", ")}\n` : "") +
        (extra.length ? `  generated but not in the spec: ${extra.join(", ")}\n` : ""),
    );
  }

  return fromSpec.size;
}

const modules = readSpec();
const total = crossCheck(modules);

// Sorted, two-space indent, trailing newline: byte-stable, so a stale list shows
// up as a diff rather than as churn.
writeFileSync(OUTPUT_PATH, `${JSON.stringify({ generatedFrom: SPEC_PATH, modules }, null, 2)}\n`);

console.log(`generate-mutation-hook-list: ${total} mutation hooks across ${modules.length} modules -> ${OUTPUT_PATH}`);

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { COMMUNITY_SCOPE_WRAPPERS } from "../../eslint.config.js";

/**
 * Every write this app can make is a decision about who may make it. This spec
 * forces that decision to exist, because the failure it guards against is
 * silent: a screen that renders a control the backend will refuse, or a new
 * endpoint that reaches a button without anyone having asked the question.
 *
 * The source of truth is api-docs.json. The generated client and the committed
 * hook list are both cross-checked against it rather than treated as
 * alternative truths, so the three drifting apart also fails. Same method as
 * endpointScope.spec.ts, next door.
 *
 * The lint rule in eslint.config.js enforces WHERE a mutation may be imported.
 * This spec enforces that every one of them has an answer to WHO -- including
 * the ones whose action hook has not been written yet.
 */

const SPEC_PATH = "api-docs.json";
const GENERATED_CLIENT_DIR = "src/api";
const GENERATED_LIST_PATH = "src/contracts/generatedMutationHooks.json";
const ACTIONS_DIR = "src/hooks/actions";

const MUTATION_METHODS = ["post", "put", "patch", "delete"];

type Scope = "platform" | "community" | "supply" | "plant" | "user" | "membership" | "sharingAgreement";

type Decision =
  | {
      scope: Scope;
      capability: string;
      /** The action hook that hands it out, when one exists yet. */
      hook?: string;
      /**
       * Set when the capability does not name this action, only covers it.
       * Every one of these is a place the UI is less precise than it could be,
       * and the string says why it is the closest honest answer.
       */
      approximates?: string;
    }
  | {
      /**
       * No capability, and a reason that survives reading. Two forms are
       * permanent -- "no session:" and "open to any authenticated caller:" --
       * and anything else must name the issue that replaces it with a gate.
       */
      ungated: string;
    };

const SYNC_JOB = "canManage covers 'triggering its synchronisation endpoints'; no per-job flag exists, and no screen calls this yet";
const AGREEMENT_LIFECYCLE = "canManage is the only write flag on an agreement; it answers 'may this person, ever', while the screen keeps answering 'is this legal in this status'";

/**
 * Who may perform each mutation. Every hook in the generated list needs an
 * entry, so a newly generated endpoint fails here until somebody decides.
 */
const ACTION_COVERAGE: Record<string, Decision> = {
  // ── Authentication ────────────────────────────────────────────────────────
  useLogin: { ungated: "no session: a capability rides on a resource fetched with a token, so none can precede the request that obtains one" },
  useLogout: { ungated: "no session: refusing to end a session on a capability would strand the caller in it" },

  // ── Configuration ─────────────────────────────────────────────────────────
  useInit: { ungated: "no session: first-run bootstrap, called before any account exists" },

  // ── Communities ───────────────────────────────────────────────────────────
  useCreateCommunity: { scope: "platform", capability: "canCreateCommunity", hook: "usePlatformActions" },
  useUpdateCommunity: { scope: "community", capability: "canUpdate", hook: "useCommunityActions" },
  useEnableCommunity: { scope: "community", capability: "canEnable", hook: "useCommunityActions" },
  useDisableCommunity: { scope: "community", capability: "canDisable", hook: "useCommunityActions" },

  // ── Consumption ───────────────────────────────────────────────────────────
  useConfigureDatadis: {
    scope: "community",
    capability: "canManage",
    hook: "useCommunityActions",
    approximates: "canManage names 'reading and writing its Datadis and Shelly configuration'; there is no per-integration flag",
  },
  useConfigureShelly: {
    scope: "community",
    capability: "canManage",
    hook: "useCommunityActions",
    approximates: "as useConfigureDatadis",
  },
  useSyncDatadisConsumptions: { scope: "community", capability: "canManage", approximates: SYNC_JOB },
  useSyncYearlyDatadisConsumptions: { scope: "community", capability: "canManage", approximates: SYNC_JOB },
  useSyncMonthlyDatadisConsumptions: { scope: "community", capability: "canManage", approximates: SYNC_JOB },

  // ── Memberships ───────────────────────────────────────────────────────────
  useCreateMembership: { scope: "community", capability: "canManageMemberships", hook: "useMembershipActions" },
  useDeleteMembership: { scope: "membership", capability: "canDelete", hook: "useMembershipActions" },
  useUpdateMembershipRole: { scope: "membership", capability: "canUpdateRole", hook: "useMembershipActions" },
  useSetMembershipInvestment: { scope: "membership", capability: "canManageInvestment", hook: "useMembershipActions" },
  useClearMembershipInvestment: { scope: "membership", capability: "canManageInvestment", hook: "useMembershipActions" },

  // ── Plants ────────────────────────────────────────────────────────────────
  useCreatePlant: {
    scope: "supply",
    capability: "canCreatePlant",
    hook: "useCommunityActions",
    approximates:
      "two surfaces, and CreatePlantPage uses both: the community's canCreatePlants gates the entry point (the Nueva Planta button, the production/new route) and hands out the action, while the supply's canCreatePlant bounds the choice -- PlantForm offers only supplies that report it, so the form cannot submit one the backend would refuse. useSupplyActions carries the per-supply action for callers that start from a supply",
  },
  useUpdatePlant: {
    scope: "plant",
    capability: "canManage",
    hook: "usePlantActions",
    approximates: "canManage covers update, delete and the Huawei config together; the UI cannot offer edit without delete",
  },
  useDeletePlant: { scope: "plant", capability: "canManage", hook: "usePlantActions", approximates: "as useUpdatePlant" },

  // ── Production ────────────────────────────────────────────────────────────
  useConfigureHuawei: {
    scope: "plant",
    capability: "canManage",
    hook: "usePlantActions",
    approximates: "plant-scoped despite sitting on the community integrations screen: the endpoint is PUT /plants/{plantId}/production/huawei/config",
  },
  useSyncYearlyHuaweiProduction: { scope: "community", capability: "canManage", approximates: SYNC_JOB },
  useSyncMonthlyHuaweiProduction: { scope: "community", capability: "canManage", approximates: SYNC_JOB },
  useSyncYearlyDatadisProduction: { scope: "community", capability: "canManage", approximates: SYNC_JOB },
  useSyncMonthlyDatadisProduction: { scope: "community", capability: "canManage", approximates: SYNC_JOB },

  // ── Sharing agreements ────────────────────────────────────────────────────
  useCreateSharingAgreement: { scope: "plant", capability: "canManageSharingAgreements", hook: "usePlantActions" },
  useUpdateSharingAgreement: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useDeleteSharingAgreement: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  usePublishSharingAgreement: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useRevertSharingAgreementToDraft: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useReplacePartitionCoefficients: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementCoefficientActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useActivatePartitionCoefficients: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementCoefficientActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useDeactivatePartitionCoefficients: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementCoefficientActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useClosePartitionCoefficients: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementCoefficientActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useReopenPartitionCoefficients: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementCoefficientActions",
    approximates: AGREEMENT_LIFECYCLE,
  },
  useGenerateSharingAgreementDistributorFile: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementActions",
    approximates: "a write not named in canManage's documented verb list; canRead covers reading the file and there is no other write flag",
  },
  useUploadSharingAgreementFile: {
    scope: "sharingAgreement",
    capability: "canManage",
    hook: "useSharingAgreementActions",
    approximates: "as useGenerateSharingAgreementDistributorFile",
  },

  // ── Supplies ──────────────────────────────────────────────────────────────
  useCreateSupply: {
    scope: "community",
    capability: "canManage",
    hook: "useCommunityActions",
    approximates: "there is no canCreateSupplies, unlike the sibling canCreatePlants and canCreateUsers; canManage's doc names 'creating and importing its supplies'",
  },
  useCreateSuppliesWithFile: { scope: "community", capability: "canManage", hook: "useCommunityActions", approximates: "as useCreateSupply" },
  useUpdateSupply: { scope: "supply", capability: "canEdit", hook: "useSupplyActions" },
  useEnableSupply: {
    scope: "supply",
    capability: "canEdit",
    hook: "useSupplyActions",
    approximates: "canEdit covers update, enable and disable together, by its own doc; the UI cannot offer edit without disable",
  },
  useDisableSupply: { scope: "supply", capability: "canEdit", hook: "useSupplyActions", approximates: "as useEnableSupply" },
  useSyncDatadisSupplies: { scope: "community", capability: "canManage", approximates: SYNC_JOB },

  // ── Users ─────────────────────────────────────────────────────────────────
  useCreateUser: {
    scope: "platform",
    capability: "canCreateUsers",
    hook: "usePlatformActions",
    approximates: "two surfaces: the platform route /users/new gates on the platform flag, a community's own member creation on community.canCreateUsers in useCommunityActions",
  },
  useCreateUsersWithFile: { scope: "community", capability: "canCreateUsers", hook: "useCommunityActions" },
  useUpdateUser: {
    scope: "user",
    capability: "canEdit",
    hook: "useUserActions",
    // canEdit is false for an ordinary member looking at their own record, by
    // design: self-service goes to PUT /users/profile. Nothing on the profile
    // screen reads this entry.
    approximates: "administrative edit of any user; the profile screen saves its own caller through useProfileActions / PUT /users/profile, which asks no capability",
  },
  useDeleteUser: { scope: "user", capability: "canDelete", hook: "useUserActions" },
  useEnableUser: { scope: "user", capability: "canEnable", hook: "useUserActions" },
  useDisableUser: { scope: "user", capability: "canDisable", hook: "useUserActions" },
  useGrantPlatformAdmin: { scope: "user", capability: "canGrantPlatformAdmin", hook: "useUserActions" },
  useRevokePlatformAdmin: { scope: "user", capability: "canRevokePlatformAdmin", hook: "useUserActions" },
  useUpdateProfile: { ungated: "open to any authenticated caller: PUT /users/profile acts on the caller and takes no id" },
};

/** The two forms of ungated reason that are permanent rather than pending work. */
const PERMANENT_UNGATED = [/^no session: /, /^open to any authenticated caller: /];

function hookNameFor(operationId: string) {
  return `use${operationId[0].toUpperCase()}${operationId.slice(1)}`;
}

function hooksFromSpec(): string[] {
  const { paths } = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
  const hooks: string[] = [];
  for (const operations of Object.values(paths as Record<string, Record<string, { operationId: string }>>)) {
    for (const [method, operation] of Object.entries(operations)) {
      if (MUTATION_METHODS.includes(method)) hooks.push(hookNameFor(operation.operationId));
    }
  }
  return hooks.sort();
}

function hooksFromGeneratedClient(): string[] {
  const hooks: string[] = [];
  for (const tag of readdirSync(GENERATED_CLIENT_DIR, { withFileTypes: true })) {
    if (!tag.isDirectory()) continue;
    for (const file of readdirSync(join(GENERATED_CLIENT_DIR, tag.name))) {
      if (!file.endsWith(".ts")) continue;
      const source = readFileSync(join(GENERATED_CLIENT_DIR, tag.name, file), "utf8");
      for (const match of source.matchAll(/export const (use[A-Z]\w*)\s*=/g)) {
        if (/useMutation/.test(source.slice(match.index, match.index + 1500))) hooks.push(match[1]);
      }
    }
  }
  return hooks.sort();
}

function readCommittedList(): { modules: { tag: string; module: string; hooks: string[] }[] } {
  return JSON.parse(readFileSync(GENERATED_LIST_PATH, "utf8"));
}

function committedHooks(): string[] {
  return readCommittedList()
    .modules.flatMap((m) => m.hooks)
    .sort();
}

function actionsLayerSource(): string {
  return readdirSync(ACTIONS_DIR)
    .filter((f) => f.endsWith(".ts") || f.endsWith(".tsx"))
    .map((f) => readFileSync(join(ACTIONS_DIR, f), "utf8"))
    .join("\n");
}

describe("the generated mutation-hook list", () => {
  it("names every non-GET operation in the API spec", () => {
    expect(
      committedHooks(),
      `${GENERATED_LIST_PATH} is out of step with ${SPEC_PATH}. Run: npm run generate-mutation-hook-list`,
    ).toEqual(hooksFromSpec());
  });

  it("stays in step with the generated client", () => {
    expect(
      committedHooks(),
      "The committed list and the generated client describe different APIs -- regenerate the client",
    ).toEqual(hooksFromGeneratedClient());
  });

  it("maps every operationId onto the hook Orval actually generates", () => {
    const { paths } = JSON.parse(readFileSync(SPEC_PATH, "utf8"));
    const malformed: string[] = [];
    for (const operations of Object.values(paths as Record<string, Record<string, { operationId: string }>>)) {
      for (const [method, operation] of Object.entries(operations)) {
        if (!MUTATION_METHODS.includes(method)) continue;
        if (!/^[a-z][A-Za-z0-9]*$/.test(operation.operationId)) malformed.push(operation.operationId);
      }
    }

    expect(
      malformed,
      "The hook name is derived as 'use' + the operationId with its first letter capitalised. " +
        "These ids are not lower camel case, so that rule no longer holds -- teach " +
        "scripts/generate-mutation-hook-list.mjs the new shape.",
    ).toEqual([]);
  });

  it("points every module at a directory the client actually has", () => {
    const missing = readCommittedList()
      .modules.map((m) => `${m.module}.ts`)
      .filter((path) => !existsSync(path));

    expect(missing).toEqual([]);
  });
});

describe("who may perform each mutation", () => {
  it("has a decision for every generated mutation", () => {
    const undecided = committedHooks().filter((hook) => !(hook in ACTION_COVERAGE));

    expect(
      undecided,
      "A new mutation reached the client without anyone deciding who may perform it. Add an entry " +
        "to ACTION_COVERAGE above: the capability its resource carries, or an `ungated` reason " +
        "saying why the backend has no answer to give.",
    ).toEqual([]);
  });

  it("keeps no decision for a mutation that no longer exists", () => {
    const hooks = new Set(committedHooks());
    const stale = Object.keys(ACTION_COVERAGE).filter((hook) => !hooks.has(hook));

    expect(stale, "These hooks are no longer generated").toEqual([]);
  });

  it("explains every approximation, so a merged or borrowed flag is never silent", () => {
    const MIN_EXPLANATION = 20;
    // "as useUpdatePlant" is allowed: a merged flag covers several actions, and
    // repeating the prose once per action would let the copies drift. The
    // reference has to resolve to an entry that does explain itself.
    const CROSS_REFERENCE = /^as (use[A-Z]\w+)$/;

    const explains = (hook: string, seen = new Set<string>()): boolean => {
      if (seen.has(hook)) return false; // a reference cycle explains nothing
      seen.add(hook);
      const decision = ACTION_COVERAGE[hook];
      if (!decision || !("capability" in decision) || decision.approximates === undefined) return false;
      const note = decision.approximates.trim();
      const reference = CROSS_REFERENCE.exec(note);
      return reference ? explains(reference[1], seen) : note.length >= MIN_EXPLANATION;
    };

    const unexplained = Object.entries(ACTION_COVERAGE)
      .filter(([, d]) => "capability" in d && d.approximates !== undefined)
      .filter(([hook]) => !explains(hook))
      .map(([hook]) => hook);

    expect(
      unexplained,
      "An `approximates` note has to say why this is the closest honest answer, or say " +
        "'as <otherHook>' and point at an entry that does.",
    ).toEqual([]);
  });

  it("holds every ungated escape to a reason that survives reading", () => {
    const bad = Object.entries(ACTION_COVERAGE)
      .filter(([, d]) => "ungated" in d)
      .filter(([, d]) => {
        const reason = (d as { ungated: string }).ungated;
        return !PERMANENT_UNGATED.some((form) => form.test(reason)) && !/#\d+/.test(reason);
      })
      .map(([hook]) => hook);

    expect(
      bad,
      "An ungated mutation is either permanently ungated -- 'no session: ...' or 'open to any " +
        "authenticated caller: ...' -- or it is a gate nobody has written yet, and then the reason " +
        "must name the issue that writes it.",
    ).toEqual([]);
  });

  it("holds the ungated() calls in the actions layer to the same shape", () => {
    const source = actionsLayerSource();
    const reasons = [...source.matchAll(/ungated\(\s*\n?\s*"([^"]*)"/g)].map((m) => m[1]);

    expect(reasons.length, "ungated() calls should be findable; has the call shape changed?").toBeGreaterThan(0);
    const bad = reasons.filter(
      (reason) => !PERMANENT_UNGATED.some((form) => form.test(reason)) && !/#\d+/.test(reason),
    );
    expect(bad).toEqual([]);
  });
});

/**
 * Test infrastructure that names a generated mutation hook without being a spec.
 *
 * Both import the hook only to type or to set a mocked result, and neither
 * calls it. They are not screens and are not migrating, so they carry an
 * eslint-disable rather than an issue number -- and they are listed here, by
 * name and by hook, so that the repo-wide assertion below stays an assertion
 * rather than a directory carve-out. Adding one takes an edit to this list.
 */
const TEST_HELPER_MUTATION_IMPORTS: Record<string, { hooks: string[]; reason: string }> = {
  "src/test/queryState.typecheck.ts": {
    hooks: ["useCreateMembership"],
    reason: "types the mutation builders against a real generated hook; never called",
  },
  "src/components/SharingAgreementCoefficientSet/SharingAgreementCoefficientSet.testUtils.tsx": {
    hooks: [
      "useActivatePartitionCoefficients",
      "useClosePartitionCoefficients",
      "useDeactivatePartitionCoefficients",
      "useReopenPartitionCoefficients",
      "useReplacePartitionCoefficients",
    ],
    reason: "sets the results of the hooks its four spec files mock; never called",
  },
};

describe("where a generated mutation may be imported", () => {
  /** What a file actually imports from a generated tag module. */
  function mutationImportsIn(path: string): string[] {
    const source = readFileSync(path, "utf8");
    const known = new Set(committedHooks());
    const found = new Set<string>();
    for (const match of source.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["'][^"']*api\/[a-z-]+\/[a-z-]+["']/g,
    )) {
      // Comments first: an eslint-disable block inside the braces usually
      // contains a comma, which would otherwise glue the name after it onto a
      // sentence and hide that import from this scan entirely.
      const names = match[1].replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "");
      for (const raw of names.split(",")) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (known.has(name)) found.add(name);
      }
    }
    return [...found].sort();
  }

  /** Every hand-written source file: the generated client is not one. */
  function sourceFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return path === GENERATED_CLIENT_DIR ? [] : sourceFiles(path);
      return /\.tsx?$/.test(entry.name) ? [path] : [];
    });
  }

  const importers = sourceFiles("src")
    .filter((path) => !path.startsWith(`${ACTIONS_DIR}/`))
    .filter((path) => !/\.spec\.tsx?$/.test(path))
    .map((path) => ({ path, hooks: mutationImportsIn(path) }))
    .filter(({ hooks }) => hooks.length > 0);

  // What MUTATION_CALL_SITES used to assert per exempt screen, now asserted
  // over the whole tree. The list it replaces reached zero in #162; stating it
  // this way means re-introducing one takes an edit here, not a quiet entry in
  // a file nobody reads.
  it("is the actions layer, and nowhere else a screen can reach", () => {
    const offenders = importers
      .filter(({ path }) => !(path in TEST_HELPER_MUTATION_IMPORTS))
      .map(({ path, hooks }) => `${path}: ${hooks.join(", ")}`);

    expect(
      offenders,
      "Mutations are reached through src/hooks/actions, never imported directly. If this is test " +
        "infrastructure rather than a screen, record it in TEST_HELPER_MUTATION_IMPORTS with the " +
        "reason it names a hook it never calls.",
    ).toEqual([]);
  });

  // Recording a FILE would exempt it for every mutation it ever grows. The
  // pair is what is frozen, so a sixth hook added tomorrow fails here even
  // though its eslint-disable still covers it.
  it("lets the test helpers name exactly the hooks recorded against them", () => {
    const drifted = Object.entries(TEST_HELPER_MUTATION_IMPORTS)
      .filter(([path]) => existsSync(path))
      .map(([path, { hooks }]) => ({ path, recorded: [...hooks].sort(), actual: mutationImportsIn(path) }))
      .filter(({ recorded, actual }) => JSON.stringify(recorded) !== JSON.stringify(actual));

    expect(drifted, "A listed test helper imports something other than what is recorded for it").toEqual([]);
  });

  it("keeps no entry for a test helper that is gone", () => {
    const stale = Object.keys(TEST_HELPER_MUTATION_IMPORTS).filter((path) => !existsSync(path));

    expect(stale).toEqual([]);
  });

  it("says why each test helper may name a mutation at all", () => {
    const MIN_EXPLANATION = 20;
    const unexplained = Object.entries(TEST_HELPER_MUTATION_IMPORTS)
      .filter(([, { reason }]) => reason.trim().length < MIN_EXPLANATION)
      .map(([path]) => path);

    expect(unexplained).toEqual([]);
  });

  it("does not quietly exempt a community-scope wrapper as well", () => {
    // Flat config gives a file matching two blocks the later block outright, so
    // a wrapper listed here too would silently drop one list's exemptions.
    const wrappers = new Set(COMMUNITY_SCOPE_WRAPPERS);
    expect(Object.keys(TEST_HELPER_MUTATION_IMPORTS).filter((path) => wrappers.has(path))).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { MUTATION_CALL_SITES, COMMUNITY_SCOPE_WRAPPERS } from "../../eslint.config.js";

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
    hook: "useSupplyActions",
    approximates:
      "two surfaces: the supply's canCreatePlant answers for a given supply, the community's canCreatePlants is 'necessary but not sufficient' by its own doc and gates the community-level entry point in useCommunityActions",
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
  useUpdateSharingAgreement: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useDeleteSharingAgreement: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  usePublishSharingAgreement: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useRevertSharingAgreementToDraft: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useReplacePartitionCoefficients: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useActivatePartitionCoefficients: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useDeactivatePartitionCoefficients: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useClosePartitionCoefficients: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useReopenPartitionCoefficients: { scope: "sharingAgreement", capability: "canManage", approximates: AGREEMENT_LIFECYCLE },
  useGenerateSharingAgreementDistributorFile: {
    scope: "sharingAgreement",
    capability: "canManage",
    approximates: "a write not named in canManage's documented verb list; canRead covers reading the file and there is no other write flag",
  },
  useUploadSharingAgreementFile: {
    scope: "sharingAgreement",
    capability: "canManage",
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
    // RELEASE BLOCKER, not a note. Profile.tsx saves the signed-in user through
    // this administrative endpoint, and canEdit is false for an ordinary member
    // looking at their own record -- so once the backend enforces capabilities,
    // no member can save their profile. The fix is to call PUT /users/profile
    // (useProfileActions), and it has to ship before or with the backend.
    approximates: "administrative edit of any user; NOT the profile screen's save -- see useProfileActions and the release blocker recorded in the #165 PR",
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

describe("the screens that predate the actions layer", () => {
  const entries = Object.entries(MUTATION_CALL_SITES) as [string, string[]][];

  /** What a file actually imports from a generated tag module. */
  function mutationImportsIn(path: string): string[] {
    const source = readFileSync(path, "utf8");
    const known = new Set(committedHooks());
    const found = new Set<string>();
    for (const match of source.matchAll(
      /import\s+(?:type\s+)?\{([^}]*)\}\s*from\s*["'][^"']*api\/[a-z-]+\/[a-z-]+["']/g,
    )) {
      for (const raw of match[1].split(",")) {
        const name = raw.trim().split(/\s+as\s+/)[0].trim();
        if (known.has(name)) found.add(name);
      }
    }
    return [...found].sort();
  }

  it("still exist", () => {
    expect(entries.filter(([path]) => !existsSync(path)).map(([path]) => path)).toEqual([]);
  });

  // The assertion a bare path list could not make. Exempting a FILE would exempt
  // it for every mutation it ever grows; pinning the pair means a second import
  // added tomorrow fails here, even though lint stays green.
  it("import exactly the mutations recorded against them, and no others", () => {
    const drifted = entries
      .map(([path, recorded]) => ({ path, recorded: [...recorded].sort(), actual: mutationImportsIn(path) }))
      .filter(({ recorded, actual }) => JSON.stringify(recorded) !== JSON.stringify(actual));

    expect(
      drifted,
      "A file exempted from the mutation rule imports something other than what MUTATION_CALL_SITES " +
        "records. If it gained a mutation, route that one through src/hooks/actions instead. If it " +
        "lost one, trim the entry -- and delete the entry entirely once the file has no mutations left.",
    ).toEqual([]);
  });

  it("never grows", () => {
    // Lowered by hand as screens migrate, so growing it takes a deliberate edit
    // with a diff rather than a quiet addition.
    expect(entries.length).toBeLessThanOrEqual(20);
  });

  it("does not overlap the community-scope wrapper list", () => {
    // Flat config gives a file matching two blocks the later block outright, so
    // an overlap would silently drop one list's exemptions.
    const wrappers = new Set(COMMUNITY_SCOPE_WRAPPERS);
    expect(entries.map(([path]) => path).filter((path) => wrappers.has(path))).toEqual([]);
  });
});

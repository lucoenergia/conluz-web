import { describe, it, expect, beforeAll } from "vitest";
import { ESLint } from "eslint";

/**
 * The mutation guard rail, asserted rather than assumed.
 *
 * `lintText` takes the path it should pretend the source lives at, so every
 * config block can be exercised without committing a probe file. That matters
 * most for the COMMUNITY_SCOPE_WRAPPERS block: it re-states a narrower patterns
 * array, so anything left out of it is silently switched off for those eight
 * files -- and none of them imports a mutation today, so the hole would have
 * stayed invisible until one of them grew a write. There is no real file to
 * point at, and this is the only way to prove the re-statement is load-bearing.
 */

const RULE = "no-restricted-imports";

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ overrideConfigFile: "eslint.config.js" });
});

async function restrictedImportErrors(source: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter((m) => m.ruleId === RULE).map((m) => m.message);
}

const importsMutation = `import { useCreateSupply } from "../../api/supplies/supplies";\nexport const x = useCreateSupply;\n`;
const importsQuery = `import { useGetAllSupplies, getGetAllSuppliesQueryKey } from "../../api/supplies/supplies";\nexport const x = [useGetAllSupplies, getGetAllSuppliesQueryKey];\n`;

describe("the mutation guard rail", () => {
  it("refuses a generated mutation hook in an ordinary screen", async () => {
    const errors = await restrictedImportErrors(importsMutation, "src/pages/probe/Probe.tsx");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("src/hooks/actions");
  });

  it("still refuses one inside a community-scope wrapper", async () => {
    // src/pages/Home.tsx is in COMMUNITY_SCOPE_WRAPPERS, whose block re-states
    // the patterns it keeps. Drop MUTATION_HOOKS from that re-statement and this
    // is the only assertion in the suite that notices.
    const errors = await restrictedImportErrors(importsMutation, "src/pages/Home.tsx");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("src/hooks/actions");
  });

  it("still refuses one inside the permissions module, which decides but never writes", async () => {
    const errors = await restrictedImportErrors(importsMutation, "src/hooks/permissions/probe.ts");

    expect(errors).toHaveLength(1);
  });

  it("allows one inside the actions layer, which is what the layer is for", async () => {
    const errors = await restrictedImportErrors(importsMutation, "src/hooks/actions/probe.ts");

    expect(errors).toEqual([]);
  });

  it("allows one in a spec, which has to name the module it mocks", async () => {
    const errors = await restrictedImportErrors(importsMutation, "src/pages/probe/Probe.spec.tsx");

    expect(errors).toEqual([]);
  });

  it("leaves queries and query-key getters importable anywhere", async () => {
    expect(await restrictedImportErrors(importsQuery, "src/pages/probe/Probe.tsx")).toEqual([]);
  });

  describe("the screens that predate the layer", () => {
    it("may still import the mutation they already had", async () => {
      // Profile.tsx and Login.tsx are the last two. Profile's own migration is
      // not a swap: PUT /users/profile takes a narrower body than the form edits,
      // which is why it is still here -- see #162.
      const errors = await restrictedImportErrors(
        `import { useUpdateUser } from "../api/users/users";\nexport const x = useUpdateUser;\n`,
        "src/pages/Profile.tsx",
      );

      expect(errors).toEqual([]);
    });

    it("are exempt from the mutation rule only, not from the community-scope one", async () => {
      // The exemption is narrow by construction: its block re-states the other
      // two arrays rather than switching the rule off for the file.
      const errors = await restrictedImportErrors(
        `import { useGetPlantById } from "../api/plants/plants";\nexport const x = useGetPlantById;\n`,
        "src/pages/Profile.tsx",
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("usePlantInActiveCommunity");
    });

    it("stop being exempt once they migrate", async () => {
      // The supply screens came off the list when they moved onto the actions
      // layer. Deleting the entry is what makes the rule bite again, and a
      // migration that left the entry behind would look identical without it.
      const errors = await restrictedImportErrors(
        `import { useUpdateSupply } from "../../api/supplies/supplies";\nexport const x = useUpdateSupply;\n`,
        "src/pages/supply-points/EditSupply.tsx",
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("useSupplyActions");
    });

    it("stop being exempt once they migrate, for the production screens too", async () => {
      const errors = await restrictedImportErrors(
        `import { useUpdatePlant } from "../../api/plants/plants";\nexport const x = useUpdatePlant;\n`,
        "src/pages/production/EditPlantPage.tsx",
      );

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("usePlantActions");
    });

    it("stop being exempt once they migrate, for members and integrations too", async () => {
      const members = await restrictedImportErrors(
        `import { useUpdateMembershipRole } from "../../api/memberships/memberships";\nexport const x = useUpdateMembershipRole;\n`,
        "src/pages/members/MembersPage.tsx",
      );

      expect(members).toHaveLength(1);
      expect(members[0]).toContain("useMembershipActions");

      // The import modal came off the list with the page that mounts it, so its
      // own entry had to go too -- a modal that still reached for the mutation
      // would have been exempt in a file nobody was looking at.
      const importModal = await restrictedImportErrors(
        `import { useCreateUsersWithFile } from "../../api/users/users";\nexport const x = useCreateUsersWithFile;\n`,
        "src/components/Modals/ImportPartnersModal.tsx",
      );

      expect(importModal).toHaveLength(1);
      expect(importModal[0]).toContain("useCommunityActions");

      const integrations = await restrictedImportErrors(
        `import { useConfigureDatadis } from "../../api/consumption/consumption";\nexport const x = useConfigureDatadis;\n`,
        "src/pages/integrations/IntegrationsPage.tsx",
      );

      expect(integrations).toHaveLength(1);
      expect(integrations[0]).toContain("useCommunityActions");
    });

    it("stop being exempt once they migrate, for communities, platform and users too", async () => {
      // The six files that made up the last large block on the list. Each is
      // named with the hook that replaced it, because the message is what tells
      // the next author where to go -- a bare refusal would send them looking.
      const cases: [string, string, string, string][] = [
        [
          "useCreateCommunity",
          "../../api/communities/communities",
          "src/pages/communities/CreateCommunityPage.tsx",
          "usePlatformActions",
        ],
        [
          "useUpdateCommunity",
          "../../api/communities/communities",
          "src/pages/communities/EditCommunityPage.tsx",
          "useCommunityActions",
        ],
        [
          "useUpdateMembershipRole",
          "../../api/memberships/memberships",
          "src/pages/communities/ManageAdminsDialog.tsx",
          "useMembershipActions",
        ],
        ["useCreateUser", "../../api/users/users", "src/pages/users/CreateUser.tsx", "usePlatformActions"],
        ["useUpdateUser", "../../api/users/users", "src/pages/users/EditUser.tsx", "useUserActions"],
        [
          "useGrantPlatformAdmin",
          "../../api/users/users",
          "src/pages/users/UsersPage.tsx",
          "useUserActions",
        ],
      ];

      for (const [hook, module, filePath, replacement] of cases) {
        const errors = await restrictedImportErrors(
          `import { ${hook} } from "${module}";\nexport const x = ${hook};\n`,
          filePath,
        );

        expect(errors, filePath).toHaveLength(1);
        expect(errors[0], filePath).toContain(replacement);
      }
    });
  });
});

import { describe, it, expect, beforeAll } from "vitest";
import { ESLint } from "eslint";

/**
 * The capability guard rail, asserted rather than assumed.
 *
 * No file outside src/hooks/permissions reads the caller's role or platform-admin
 * flag today, so `npm run lint` passing says nothing about whether the rule would
 * catch the next one. These probes do: `lintText` takes the path the source
 * should pretend to live at, so each config block that carries the rule -- and
 * the one that drops it -- is exercised without committing a probe file.
 */

const SYNTAX_RULE = "no-restricted-syntax";
const IMPORT_RULE = "no-restricted-imports";

let eslint: ESLint;

beforeAll(() => {
  eslint = new ESLint({ overrideConfigFile: "eslint.config.js" });
});

async function errorsOf(rule: string, source: string, filePath: string): Promise<string[]> {
  const [result] = await eslint.lintText(source, { filePath });
  return result.messages.filter((m) => m.ruleId === rule).map((m) => m.message);
}

const roleGateErrors = (source: string, filePath: string) => errorsOf(SYNTAX_RULE, source, filePath);

// One gate per way of reading the caller's privilege. Each is a complete module,
// so a parse error cannot pass for a missing finding.
const ROLE_GATES: [string, string][] = [
  [
    "a comparison against the CommunityRole enum",
    `import { CommunityRole } from "../../hooks/permissions";\nexport const isAdmin = (role: string) => role === CommunityRole.COMMUNITY_ADMIN;\n`,
  ],
  [
    "the platform-admin flag",
    `declare const user: { isPlatformAdmin?: boolean } | undefined;\nexport const show = user?.isPlatformAdmin === true;\n`,
  ],
  [
    "a role read from the caller's memberships by key",
    `declare const user: { memberships: Record<string, string> };\ndeclare const id: string;\nexport const role = user.memberships[id];\n`,
  ],
  [
    "a role read from a memberships map held in a variable",
    `declare const memberships: Record<string, string>;\ndeclare const id: string;\nexport const role = memberships[id];\n`,
  ],
  [
    "the roles of every membership at once",
    `declare const user: { memberships?: Record<string, string> };\nexport const anyAdmin = Object.values(user.memberships ?? {}).includes("COMMUNITY_ADMIN");\n`,
  ],
  [
    "the memberships as role pairs",
    `declare const memberships: Record<string, string>;\nexport const pairs = Object.entries(memberships);\n`,
  ],
  [
    "the roles of a memberships map held in a variable",
    `declare const memberships: Record<string, string> | undefined;\nexport const roles = Object.values(memberships ?? {});\n`,
  ],
];

describe("the capability guard rail", () => {
  describe.each(ROLE_GATES)("refuses %s", (_, source) => {
    it("in an ordinary screen", async () => {
      const errors = await roleGateErrors(source, "src/pages/probe/Probe.tsx");

      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain("src/hooks/permissions");
    });

    it("in the Notice component, whose block re-states the syntax rules", async () => {
      expect(await roleGateErrors(source, "src/components/Notice/Probe.tsx")).toHaveLength(1);
    });

    it("in the actions layer", async () => {
      expect(await roleGateErrors(source, "src/hooks/actions/probe.ts")).toHaveLength(1);
    });

    it("but not inside the permissions module, which is where it belongs", async () => {
      expect(await roleGateErrors(source, "src/hooks/permissions/probe.ts")).toEqual([]);
    });

    it("but not in a spec, whose fixtures carry roles as data", async () => {
      expect(await roleGateErrors(source, "src/pages/probe/Probe.spec.tsx")).toEqual([]);
    });
  });

  it("leaves asking which communities the caller belongs to alone", async () => {
    // The active community is chosen from these; neither reads a role.
    const source =
      `declare const user: { memberships?: Record<string, string> };\ndeclare const id: string;\n` +
      `export const ids = Object.keys(user.memberships ?? {});\nexport const belongs = id in (user.memberships ?? {});\n`;

    expect(await roleGateErrors(source, "src/pages/probe/Probe.tsx")).toEqual([]);
  });

  it("leaves a target row's role alone, which is the resource's own state", async () => {
    const source =
      `import { MembershipResponseRole } from "../../api/models";\n` +
      `declare const row: { role: string };\nexport const label = row.role === MembershipResponseRole.COMMUNITY_ADMIN ? "Administrador" : "Miembro";\n`;

    expect(await roleGateErrors(source, "src/pages/probe/Probe.tsx")).toEqual([]);
  });

  it("refuses the role hook outside the permissions module", async () => {
    const source = `import { useActiveCommunityRole } from "../../hooks/permissions/useActiveCommunityRole";\nexport const x = useActiveCommunityRole;\n`;

    const errors = await errorsOf(IMPORT_RULE, source, "src/pages/probe/Probe.tsx");

    expect(errors).toHaveLength(1);
    expect(errors[0]).toContain("src/hooks/permissions");
  });
});

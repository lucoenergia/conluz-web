// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { ESLint } from "eslint";
import { PAGE_WIDTH_CAP_EXEMPTIONS } from "../../eslint.config.js";

/**
 * The page layout rules in eslint.config.js, run through ESLint's Node API
 * with the project's own config (#415). Linting probes proves each rule fires
 * where it should and stays quiet where it should, rather than restating its
 * selectors.
 */

const RULE = "no-restricted-syntax";
const SPEC_DOCUMENT = "docs/specs/layout.md";

/** A page no exemption covers. It need not exist: lintText only uses it to pick the config. */
const PAGE_PROBE = "src/pages/layout-probe/LayoutProbe.tsx";
const EXEMPT = ["src/pages/Profile.tsx", "src/pages/auth/ChangePassword.tsx"];

const eslint = new ESLint();

async function syntaxMessages(body: string, filePath = PAGE_PROBE): Promise<string[]> {
  const code =
    `import { Alert, Box, Skeleton } from "@mui/material";\nimport { sxStyles } from "../../theme/sx";\n` +
    `declare const user: { isPlatformAdmin?: boolean } | undefined;\n${body}\n`;
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE).map((message) => message.message);
}

const TOKENS = ["pageRoot", "pageContainer", "pageContainerFull", "softPanel"];

describe("UI-LAY-001 no page root or page-level panel caps its width", () => {
  describe.each(TOKENS)("beside sxStyles.%s", (token) => {
    it(`UI-LAY-001 refuses a maxWidth spread into the same sx object as ${token}`, async () => {
      const messages = await syntaxMessages(`export const Probe = () => <Box sx={{ ...sxStyles.${token}, maxWidth: 960 }} />;`);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain(SPEC_DOCUMENT);
      expect(messages[0]).toContain("UI-LAY-001");
    }, 30_000);

    it(`UI-LAY-001 refuses a maxWidth in the same sx array as ${token}`, async () => {
      const messages = await syntaxMessages(`export const Probe = () => <Box sx={[sxStyles.${token}, { maxWidth: 960, mx: "auto" }]} />;`);

      expect(messages).toHaveLength(1);
      expect(messages[0]).toContain("UI-LAY-001");
    }, 30_000);
  });

  it("UI-LAY-001 refuses a cap kept in a constant outside the JSX", async () => {
    const messages = await syntaxMessages(
      `const panelSx = { ...sxStyles.softPanel, "maxWidth": 800 };\nexport const Probe = () => <Box sx={panelSx} />;`,
    );

    expect(messages).toHaveLength(1);
  }, 30_000);

  it.each([
    ["a skeleton", `export const Probe = () => <Skeleton variant="rounded" height={56} sx={{ maxWidth: 560 }} />;`],
    ["a selector's own box", `export const Probe = () => <Box sx={{ maxWidth: 560 }} />;`],
    [
      "a selector's box inside the page container",
      `export const Probe = () => <Box sx={sxStyles.pageContainer}><Box sx={{ maxWidth: 560 }} /></Box>;`,
    ],
    [
      "a control reached through a nested selector",
      `export const Probe = () => <Box sx={{ ...sxStyles.pageContainer, "& .MuiTabs-root": { maxWidth: 480 } }} />;`,
    ],
  ])("UI-LAY-001 allows a width limit on a control: %s", async (_, body) => {
    expect(await syntaxMessages(body)).toEqual([]);
  }, 30_000);

  it.each(EXEMPT)("UI-LAY-001 allows %s to cap its single form panel", async (filePath) => {
    const body = `export const Probe = () => <Box sx={[sxStyles.softPanel, { width: "100%", maxWidth: 600, margin: "0 auto" }]} />;`;

    expect(await syntaxMessages(body, filePath)).toEqual([]);
  }, 30_000);

  it("UI-LAY-001 exempts exactly Profile and Change password", () => {
    expect([...PAGE_WIDTH_CAP_EXEMPTIONS].sort()).toEqual([...EXEMPT].sort());
    expect(PAGE_WIDTH_CAP_EXEMPTIONS.filter((file) => !existsSync(file))).toEqual([]);
  });

  it("UI-LAY-001 says nothing outside src/pages, where a token is not a page", async () => {
    const body = `export const Probe = () => <Box sx={{ ...sxStyles.softPanel, maxWidth: 960 }} />;`;

    expect(await syntaxMessages(body, "src/components/LayoutProbe/LayoutProbe.tsx")).toEqual([]);
  }, 30_000);
});

describe("UI-LAY-002 every page uses the shared page root", () => {
  it.each([
    ["a page", PAGE_PROBE],
    ["Profile", EXEMPT[0]],
    ["Change password", EXEMPT[1]],
  ])("UI-LAY-002 refuses a hand-built root in %s", async (_, filePath) => {
    const messages = await syntaxMessages(
      `export const Probe = () => <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }} />;`,
      filePath,
    );

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("sxStyles.pageRoot");
    expect(messages[0]).toContain(SPEC_DOCUMENT);
    expect(messages[0]).toContain("UI-LAY-002");
  }, 30_000);

  it("UI-LAY-002 refuses a root whose height is derived from the viewport", async () => {
    const messages = await syntaxMessages(`export const Probe = () => <Box sx={{ minHeight: "calc(100vh - 64px)" }} />;`);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("UI-LAY-002");
  }, 30_000);

  it.each([
    ["the shared root", `export const Probe = () => <Box sx={sxStyles.pageRoot} />;`],
    ["the shared root with a local override", `export const Probe = () => <Box sx={[sxStyles.pageRoot, { overflow: "hidden" }]} />;`],
    ["a minimum height that is not the viewport's", `export const Probe = () => <Box sx={{ minHeight: 56 }} />;`],
  ])("UI-LAY-002 allows %s", async (_, body) => {
    expect(await syntaxMessages(body)).toEqual([]);
  }, 30_000);

  it("UI-LAY-002 leaves the token's own definition alone", async () => {
    const [result] = await eslint.lintFiles(["src/theme/sx.ts"]);

    expect(result.messages.filter((message) => message.ruleId === RULE)).toEqual([]);
  }, 30_000);
});

// The page blocks re-state every set the main block carries, because a later
// block replaces the rule's options for the files it shares with an earlier
// one. These probes fail if a set is dropped from either block.
describe("the page layout blocks keep the other syntax guard rails", () => {
  const OTHER_RULES: [string, string][] = [
    ["a hard-coded colour", `export const Probe = () => <Box sx={{ color: "#123456" }} />;`],
    ["a read of the platform-admin flag", `export const show = user?.isPlatformAdmin === true;`],
    ["an info Alert", `export const Probe = () => <Alert severity="info">Hecho</Alert>;`],
  ];

  describe.each([
    ["a page", PAGE_PROBE],
    ["Profile", EXEMPT[0]],
    ["Change password", EXEMPT[1]],
  ])("in %s", (_, filePath) => {
    it.each(OTHER_RULES)("still refuses %s", async (__, body) => {
      expect(await syntaxMessages(body, filePath)).toHaveLength(1);
    }, 30_000);
  });
});

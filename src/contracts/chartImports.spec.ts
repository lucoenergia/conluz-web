// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { ESLint } from "eslint";
import { CHART_IMPORT_RESTRICTION, CHART_MODULE_ALLOWLIST } from "../../eslint.config.js";

/**
 * The bar-chart import rule in eslint.config.js, run through ESLint's Node API
 * with the project's own config (#425). Linting probes proves the rule fires
 * where it should and stays quiet where it should, and that it shares
 * `@typescript-eslint/no-restricted-imports` with the overlay guard rail
 * without switching either off.
 */

const RULE = "@typescript-eslint/no-restricted-imports";
const CHART_MESSAGE = "See docs/specs/charts.md (UI-CHT-002).";
const OVERLAY_MESSAGE = "Use ResponsiveOverlay (src/components/ResponsiveOverlay)";

/** Files no allowlist entry covers. They need not exist: lintText only uses them to pick the config. */
const PAGE_PROBE = "src/pages/chart-probe/ChartProbe.tsx";
const SPEC_PROBE = "src/pages/chart-probe/ChartProbe.spec.tsx";

const eslint = new ESLint();

async function restrictedImports(code: string, filePath = PAGE_PROBE) {
  const [result] = await eslint.lintText(`${code}\nexport const probe = 1;\n`, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE);
}

describe("UI-CHT-002 ApexCharts only from an allowlisted module", () => {
  it.each([
    ["a page", PAGE_PROBE],
    ["a spec", SPEC_PROBE],
  ])("UI-CHT-002 refuses react-apexcharts in %s outside the allowlist", async (_, filePath) => {
    const messages = await restrictedImports('import Chart from "react-apexcharts";', filePath);

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
    expect(messages[0].message).toContain(CHART_MESSAGE);
  }, 30_000);

  it("UI-CHT-002 refuses a value import of apexcharts", async () => {
    const messages = await restrictedImports('import ApexCharts from "apexcharts";');

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain(CHART_MESSAGE);
  }, 30_000);

  it("UI-CHT-002 allows a type-only import of apexcharts", async () => {
    expect(await restrictedImports('import type { ApexOptions } from "apexcharts";')).toEqual([]);
  }, 30_000);

  it("UI-CHT-002 allows react-apexcharts in an allowlisted module", async () => {
    expect(await restrictedImports('import Chart from "react-apexcharts";', "src/pages/home/member/BestHoursChart.tsx")).toEqual([]);
  }, 30_000);

  it("UI-CHT-002 an allowlisted chart module still refuses an MUI overlay primitive", async () => {
    const messages = await restrictedImports('import { Dialog } from "@mui/material";', "src/pages/home/member/BestHoursChart.tsx");

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain(OVERLAY_MESSAGE);
  }, 30_000);

  it.each([
    ["on the overlay allowlist", "src/components/Menu/SideMenu.tsx"],
    ["in ResponsiveOverlay", "src/components/ResponsiveOverlay/Probe.tsx"],
  ])("UI-CHT-002 a file %s still refuses react-apexcharts", async (_, filePath) => {
    const messages = await restrictedImports('import Chart from "react-apexcharts";', filePath);

    expect(messages).toHaveLength(1);
    expect(messages[0].message).toContain(CHART_MESSAGE);
  }, 30_000);

  it("UI-CHT-002 keeps no allowlist entry for a file that is gone or no longer imports ApexCharts", async () => {
    const missing = CHART_MODULE_ALLOWLIST.filter((file) => !existsSync(file));
    expect(missing, "These allowlisted files do not exist: remove them from the allowlist").toEqual([]);

    // The same files, with the restriction switched back on for them.
    const strict = new ESLint({
      overrideConfig: { files: CHART_MODULE_ALLOWLIST, rules: { [RULE]: ["error", CHART_IMPORT_RESTRICTION] } },
    });
    const results = await strict.lintFiles(CHART_MODULE_ALLOWLIST);
    const stale = results
      .filter((result) => !result.messages.some((message) => message.ruleId === RULE))
      .map((result) => result.filePath.replace(`${process.cwd()}/`, ""));

    expect(stale, "These allowlisted files no longer import ApexCharts: remove them from the allowlist").toEqual([]);
    expect(results).toHaveLength(CHART_MODULE_ALLOWLIST.length);
  }, 120_000);
});

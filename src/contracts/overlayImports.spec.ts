// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync } from "node:fs";
import { ESLint } from "eslint";
import { OVERLAY_IMPORT_RESTRICTION, OVERLAY_PRIMITIVE_ALLOWLIST } from "../../eslint.config.js";

/**
 * The overlay import rule in eslint.config.js, run through ESLint's Node API
 * with the project's own config (#368). Linting probes proves the rule fires
 * where it should and stays quiet where it should, rather than restating its
 * options.
 */

const RULE = "@typescript-eslint/no-restricted-imports";
const MESSAGE =
  "Use ResponsiveOverlay (src/components/ResponsiveOverlay) for create, edit, action and confirmation flows. See docs/specs/overlays.md.";

/** A file no allowlist entry covers. It need not exist: lintText only uses it to pick the config. */
const PROBE_PATH = "src/pages/overlay-probe/OverlayProbe.tsx";

const eslint = new ESLint();

async function overlayMessages(code: string, filePath = PROBE_PATH) {
  const [result] = await eslint.lintText(code, { filePath });
  return result.messages.filter((message) => message.ruleId === RULE);
}

describe("UI-OVL-008 MUI overlay primitives only through ResponsiveOverlay", () => {
  it.each([
    ['import { Dialog } from "@mui/material";', "Dialog"],
    ['import { Box, Modal } from "@mui/material";', "Modal"],
    ['import { Drawer, type DrawerProps } from "@mui/material";', "Drawer"],
    ['import { SwipeableDrawer } from "@mui/material";', "SwipeableDrawer"],
    ['import Dialog from "@mui/material/Dialog";', "@mui/material/Dialog"],
    ['import Modal from "@mui/material/Modal";', "@mui/material/Modal"],
    ['import Drawer from "@mui/material/Drawer";', "@mui/material/Drawer"],
    ['import SwipeableDrawer from "@mui/material/SwipeableDrawer";', "@mui/material/SwipeableDrawer"],
  ])("UI-OVL-008 refuses %s outside the allowlist", async (code) => {
    const messages = await overlayMessages(`${code}\nexport const probe = 1;\n`);

    expect(messages).toHaveLength(1);
    expect(messages[0].severity).toBe(2);
    expect(messages[0].message).toContain(MESSAGE);
  }, 30_000);

  it.each([
    'import type { DialogProps } from "@mui/material";',
    'import type { DialogProps } from "@mui/material/Dialog";',
    'import type { SwipeableDrawerProps } from "@mui/material/SwipeableDrawer";',
    'import { DialogActions, DialogContent, DialogTitle } from "@mui/material";',
    'import DialogTitle from "@mui/material/DialogTitle";',
  ])("UI-OVL-008 allows %s", async (code) => {
    expect(await overlayMessages(`${code}\nexport const probe = 1;\n`)).toEqual([]);
  }, 30_000);

  it("UI-OVL-008 allows the primitives inside ResponsiveOverlay itself", async () => {
    const code = 'import { Dialog } from "@mui/material";\nexport const probe = Dialog;\n';

    expect(await overlayMessages(code, "src/components/ResponsiveOverlay/Probe.tsx")).toEqual([]);
  }, 30_000);

  it("UI-OVL-008 allows the primitives in an allowlisted file", async () => {
    const code = 'import { Drawer } from "@mui/material";\nexport const probe = Drawer;\n';

    expect(await overlayMessages(code, "src/components/Menu/SideMenu.tsx")).toEqual([]);
  }, 30_000);

  it("UI-OVL-008 keeps no allowlist entry for a file that is gone or no longer imports a primitive", async () => {
    const missing = OVERLAY_PRIMITIVE_ALLOWLIST.filter((file) => !existsSync(file));
    expect(missing, "These allowlisted files do not exist: remove them from the allowlist").toEqual([]);

    // The same files, with the restriction switched back on for them.
    const strict = new ESLint({
      overrideConfig: { files: OVERLAY_PRIMITIVE_ALLOWLIST, rules: { [RULE]: ["error", OVERLAY_IMPORT_RESTRICTION] } },
    });
    const results = await strict.lintFiles(OVERLAY_PRIMITIVE_ALLOWLIST);
    const stale = results
      .filter((result) => !result.messages.some((message) => message.ruleId === RULE))
      .map((result) => result.filePath.replace(`${process.cwd()}/`, ""));

    expect(
      stale,
      "These allowlisted files no longer import a MUI overlay primitive: remove them from the allowlist",
    ).toEqual([]);
    expect(results).toHaveLength(OVERLAY_PRIMITIVE_ALLOWLIST.length);
  }, 120_000);
});

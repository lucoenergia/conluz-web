// @vitest-environment node
import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";

/**
 * Every component under src/components/ is either published to Claude Design
 * or listed below with the reason it is not (AGENTS.md, "Design system").
 *
 * What gets published is a hand-kept list, `.design-sync/pkg/index.ts`; the
 * sync never looks for components itself. Components extracted from pages
 * without design-system work stayed out of it unnoticed until a sync listed
 * them, so a new component now has to be classified when it lands.
 */

const COMPONENTS_DIR = "src/components";
const ENTRY = ".design-sync/pkg/index.ts";
const CONFIG = ".design-sync/config.json";
const PREVIEWS_DIR = ".design-sync/previews";

/** Not components: test specs, type-level tests, test helpers, Storybook stories, and folder re-exports of a component already counted. */
const NOT_COMPONENT_FILES = [/\.spec\.tsx$/, /\.typecheck\.tsx$/, /\.testUtils\.tsx$/, /\.stories\.tsx$/, /\/index\.tsx$/];

interface NotSynced {
  file: string;
  component: string;
  reason: string;
}

const ROUTE_GUARD = "A route guard: it reads the session to decide where the caller goes, and draws nothing of its own.";
const OVERLAY_PART =
  "Works only inside an open ResponsiveOverlay, whose close path it calls; AppModal and ConfirmationModal show it in place.";

/**
 * The components that are not synced, each with why. An entry is a file and
 * the component it exports, so a renamed or moved component fails the stale
 * check below instead of keeping a silent exemption.
 */
const NOT_SYNCED: NotSynced[] = [
  { file: "AddSupplyDialog/AddSupplyDialog.tsx", component: "AddSupplyDialog", reason: "Reads the community's supplies through a generated query hook." },
  { file: "Auth/AnonRoute.tsx", component: "AnonRoute", reason: ROUTE_GUARD },
  { file: "Auth/CapabilityRoute.tsx", component: "CapabilityRoute", reason: ROUTE_GUARD },
  { file: "Auth/ProtectedRoute.tsx", component: "ProtectedRoute", reason: ROUTE_GUARD },
  { file: "CoefficientHistoryDrawer/CoefficientHistoryDrawer.tsx", component: "CoefficientHistoryDrawer", reason: "Reads the coefficient history through a generated query hook." },
  { file: "CsvImportDialog/CsvImportDialog.tsx", component: "CsvImportDialog", reason: "Its run is an action from src/hooks/actions/." },
  { file: "ErrorBoundries/AuthErrorBoundry.tsx", component: "AuthErrorBoundry", reason: "An error boundary: it renders its children, or a bare sentence once a 401 ends the session." },
  { file: "Errors/ErrorDisplay.tsx", component: "ErrorDisplay", reason: "Reads the error context." },
  { file: "Header/Header.tsx", component: "Header", reason: "Holds ProfileMenu, which reads the signed-in user." },
  { file: "Header/PasswordChangeHeader.tsx", component: "PasswordChangeHeader", reason: "Calls useLogout." },
  { file: "Menu/ProfileMenu.tsx", component: "ProfileMenu", reason: "Reads the signed-in user's capabilities and calls useLogout." },
  { file: "Modals/ConfirmationActions.tsx", component: "ConfirmationActions", reason: OVERLAY_PART },
  { file: "Modals/ModalCancelButton.tsx", component: "ModalCancelButton", reason: OVERLAY_PART },
  { file: "ResponsiveOverlay/ResponsiveOverlay.tsx", component: "ResponsiveOverlay", reason: "The overlay primitive: AppModal and ConfirmationModal are the dialogs designs use." },
  { file: "ScopeContext/ScopeContext.tsx", component: "ScopeContext", reason: "Reads the active community's details through a generated query hook." },
  { file: "SharingAgreementCoefficientSet/SharingAgreementCoefficientSet.tsx", component: "SharingAgreementCoefficientSet", reason: "Reads the community and success contexts, and embeds AddSupplyDialog." },
  { file: "SharingAgreementDetailHeader/SharingAgreementDetailHeader.tsx", component: "SharingAgreementDetailHeader", reason: "Reads users through a generated query hook." },
  { file: "SharingAgreementFilePanel/SharingAgreementFilePanel.tsx", component: "SharingAgreementFilePanel", reason: "Uses actions from src/hooks/actions/." },
  { file: "SharingAgreementGenerateDialog/SharingAgreementGenerateDialog.tsx", component: "SharingAgreementGenerateDialog", reason: "Uses actions from src/hooks/actions/." },
  { file: "SharingAgreementUploadDialog/SharingAgreementUploadDialog.tsx", component: "SharingAgreementUploadDialog", reason: "Uses actions from src/hooks/actions/." },
  { file: "Success/SuccessDisplay.tsx", component: "SuccessDisplay", reason: "Reads the success context." },
  { file: "SupplyCoefficientHistorySection/SupplyCoefficientHistorySection.tsx", component: "SupplyCoefficientHistorySection", reason: "Reads the coefficient history through a generated query hook." },
  { file: "period/HistoricalPeriodContext.tsx", component: "HistoricalPeriodContext", reason: "A React context, not a component." },
];

const key = (file: string, component: string) => `${file}#${component}`;

function componentFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return componentFiles(path);
    return path.endsWith(".tsx") && !NOT_COMPONENT_FILES.some((pattern) => pattern.test(path)) ? [path] : [];
  });
}

const parse = (path: string) => ts.createSourceFile(path, readFileSync(path, "utf8"), ts.ScriptTarget.Latest, true);

const isExported = (node: ts.Node) =>
  ts.canHaveModifiers(node) && (ts.getModifiers(node) ?? []).some((modifier) => modifier.kind === ts.SyntaxKind.ExportKeyword);

/** A PascalCase name: a component (ALL_CAPS constants and camelCase helpers are not). */
const isComponentName = (name: string) => /^[A-Z][a-z]/.test(name);

/** The components a file declares and exports: functions, classes and constants with a PascalCase name. */
function exportedComponents(path: string): string[] {
  const names: string[] = [];
  for (const statement of parse(path).statements) {
    if (!isExported(statement)) continue;
    if ((ts.isFunctionDeclaration(statement) || ts.isClassDeclaration(statement)) && statement.name) names.push(statement.name.text);
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        if (ts.isIdentifier(declaration.name)) names.push(declaration.name.text);
      }
    }
  }
  return names.filter(isComponentName);
}

/** What the design-system entry re-exports from src/components/, as "Dir/File.tsx#Name". */
function syncedComponents(): Map<string, string> {
  const synced = new Map<string, string>();
  for (const statement of parse(ENTRY).statements) {
    if (!ts.isExportDeclaration(statement) || !statement.moduleSpecifier || !statement.exportClause) continue;
    if (!ts.isStringLiteral(statement.moduleSpecifier) || !ts.isNamedExports(statement.exportClause)) continue;
    const target = resolve(".design-sync/pkg", statement.moduleSpecifier.text);
    const file = relative(COMPONENTS_DIR, target);
    if (file.startsWith("..")) continue;
    for (const element of statement.exportClause.elements) {
      const name = element.name.text;
      if (isComponentName(name)) synced.set(key(`${file}.tsx`, name), name);
    }
  }
  return synced;
}

const inventory = componentFiles(COMPONENTS_DIR).flatMap((path) =>
  exportedComponents(path).map((component) => ({ file: relative(COMPONENTS_DIR, path), component })),
);
const synced = syncedComponents();
const notSynced = new Map(NOT_SYNCED.map((entry) => [key(entry.file, entry.component), entry]));

describe("design-system sync covers src/components", () => {
  it("finds the components it classifies", () => {
    // Guards the scan itself: an inventory that found nothing would pass every check below.
    expect(inventory.length).toBeGreaterThan(100);
    expect(synced.size).toBeGreaterThan(80);
  });

  it("classifies every exported component: synced, or listed as not synced with a reason", () => {
    const unclassified = inventory
      .map(({ file, component }) => key(file, component))
      .filter((entry) => !synced.has(entry) && !notSynced.has(entry));

    expect(
      unclassified,
      "These components are neither exported from .design-sync/pkg/index.ts nor listed in NOT_SYNCED. " +
        "If the component renders with ConluzProvider alone, sync it (the conluz-web-design-system skill, " +
        "\"Adding a component\"); otherwise add it to NOT_SYNCED with the reason.",
    ).toEqual([]);
  });

  it("lists no component that is synced", () => {
    const both = [...notSynced.keys()].filter((entry) => synced.has(entry));
    expect(both, "These are exported from .design-sync/pkg/index.ts: remove them from NOT_SYNCED").toEqual([]);
  });

  it("keeps no entry for a component that is gone, moved or renamed", () => {
    const exported = new Set(inventory.map(({ file, component }) => key(file, component)));
    const stale = [...notSynced.keys()].filter((entry) => !exported.has(entry));
    expect(stale, "No such exported component: remove or update these NOT_SYNCED entries").toEqual([]);
  });

  it("gives every entry a reason", () => {
    expect(NOT_SYNCED.filter((entry) => entry.reason.trim() === "").map((entry) => key(entry.file, entry.component))).toEqual([]);
  });

  it("gives every synced component a preview and a docsMap group", () => {
    const { docsMap } = JSON.parse(readFileSync(CONFIG, "utf8")) as { docsMap: Record<string, string> };
    const names = [...synced.values()];

    expect(names.filter((name) => !existsSync(join(PREVIEWS_DIR, `${name}.tsx`))), `Missing ${PREVIEWS_DIR}/<Name>.tsx`).toEqual([]);
    expect(names.filter((name) => !(name in docsMap)), `Missing from docsMap in ${CONFIG}`).toEqual([]);
  });
});

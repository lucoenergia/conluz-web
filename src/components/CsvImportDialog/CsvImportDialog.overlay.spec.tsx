import "@testing-library/jest-dom";
import { useState, type ReactNode } from "react";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { apiError } from "../../test/apiError";
import { declaredStyles, pressBack, scrollingAncestors, stubViewport } from "../../test/overlay";
import { VISIBLE } from "../../test/visibleText";
import { overlayHistorySettled } from "../ResponsiveOverlay/overlayHistory";
import type { ImportMembersResponse, ImportSuppliesResponse } from "../../api/models";
import { ImportSuppliesDialog } from "../../pages/supply-points/ImportSuppliesDialog";
import { ImportMembersDialog } from "../../pages/members/ImportMembersDialog";

/**
 * The CSV import on the shared overlay (#371), through both of its consumers:
 * the supply import and the member import. Each is handed an action whose
 * answer the test controls, so an import can be held in flight.
 */

const COMMUNITY_NAME = "Comunidad Solar";
const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";

/** More failed rows than the result can show at once. */
const SUPPLY_RESULT: ImportSuppliesResponse = {
  created: 1,
  failed: 4,
  rows: [
    { line: 2, outcome: "CREATED", code: null, message: null, errors: [] },
    ...[3, 4, 5, 6].map((line): ImportSuppliesResponse["rows"][number] => ({
      line,
      outcome: "FAILED",
      code: "SUPPLY_ALREADY_EXISTS",
      message: "TEST-SERVER-MESSAGE",
      errors: [],
    })),
  ],
};

const MEMBER_RESULT: ImportMembersResponse = {
  registered: 1,
  failed: 4,
  rows: [
    { line: 2, outcome: "REGISTERED", code: null, message: null, errors: [] },
    ...[3, 4, 5, 6].map((line): ImportMembersResponse["rows"][number] => ({
      line,
      outcome: "FAILED",
      code: "MEMBERSHIP_IMPORT_ROW_INVALID",
      message: "TEST-SERVER-MESSAGE",
      errors: [{ column: "fullName", constraint: "REQUIRED", params: {} }],
    })),
  ],
};

/** What the import answers: nothing yet, its result, or a refusal of the whole file. */
type Answer = "held" | "result" | "refused";

/** The import action a page hands over, answering as told. */
const actionAnswering = <R,>(answer: Answer, result: R, refusal: unknown) => ({
  run: (): Promise<{ ok: true; value: R } | { error: unknown }> =>
    answer === "held"
      ? new Promise(() => {})
      : Promise.resolve(answer === "result" ? { ok: true, value: result } : { error: refusal }),
  isPending: false,
});

type Consumer = {
  title: string;
  /** The result's summary, as shown. */
  summary: RegExp;
  failedRowsHeading: string;
  render: (answer: Answer, onClose: () => void) => ReactNode;
};

const SUPPLIES: Consumer = {
  title: `Importar puntos de suministro en ${COMMUNITY_NAME}`,
  summary: /^Se ha creado 1 punto de suministro\./,
  failedRowsHeading: "Filas no creadas",
  render: (answer, onClose) => (
    <ImportSuppliesDialog
      communityName={COMMUNITY_NAME}
      importSupplies={actionAnswering(answer, SUPPLY_RESULT, apiError(400, { code: "SUPPLY_IMPORT_MALFORMED_FILE" }))}
      onClose={onClose}
    />
  ),
};

const MEMBERS: Consumer = {
  title: `Importar miembros en ${COMMUNITY_NAME}`,
  summary: /^Se ha registrado 1 miembro\./,
  failedRowsHeading: "Filas no registradas",
  render: (answer, onClose) => (
    <ImportMembersDialog
      communityName={COMMUNITY_NAME}
      importMembers={actionAnswering(answer, MEMBER_RESULT, apiError(400, { code: "MEMBERSHIP_IMPORT_MALFORMED_FILE" }))}
      invitable={false}
      onClose={onClose}
    />
  ),
};

const CONSUMERS: Array<[string, Consumer]> = [
  ["the supply import", SUPPLIES],
  ["the member import", MEMBERS],
];

/** The page the import opens from: the dialog is mounted on open, as both pages mount it. */
function Host({ consumer, answer }: { consumer: Consumer; answer: Answer }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Abrir importación
      </button>
      {open && consumer.render(answer, () => setOpen(false))}
    </>
  );
}

type User = ReturnType<typeof userEvent.setup>;

async function openImport(consumer: Consumer, answer: Answer = "held") {
  const u = userEvent.setup();
  renderWithProviders(<Host consumer={consumer} answer={answer} />);
  await u.click(screen.getByRole("button", { name: "Abrir importación" }));
  const dialog = await screen.findByRole("dialog", { name: consumer.title });
  await act(() => overlayHistorySettled());
  return { u, dialog };
}

const csvFile = () => new File(["code;address\r\n"], "datos.csv", { type: "text/csv" });

const chooseFile = (u: User, dialog: HTMLElement) =>
  u.upload(within(dialog).getByLabelText("Seleccionar archivo CSV"), csvFile());

async function importFile(u: User, dialog: HTMLElement) {
  await chooseFile(u, dialog);
  await u.click(within(dialog).getByRole("button", { name: "Importar" }));
}

async function showResult(consumer: Consumer) {
  const opened = await openImport(consumer, "result");
  await importFile(opened.u, opened.dialog);
  await within(opened.dialog).findByText(consumer.summary, VISIBLE);
  return opened;
}

const closed = () => waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());

beforeEach(() => {
  stubViewport(390);
});

afterEach(async () => {
  // An overlay left open gives its history entry back on unmount: let that
  // back land before the next test reads the history.
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe("UI-OVL-001 the CSV import: a sheet below md, a form dialog from md up", () => {
  it("UI-OVL-001 renders the supply import as a sheet at 899 px and a form dialog at 900 px", async () => {
    stubViewport(899);
    expect((await openImport(SUPPLIES)).dialog).toHaveClass("MuiDrawer-paperAnchorBottom");
    cleanup();
    await act(() => overlayHistorySettled());

    stubViewport(900);
    const { dialog } = await openImport(SUPPLIES);
    expect(dialog).toHaveClass("MuiDialog-paper");
    expect(declaredStyles(dialog)).toContain("width:560px");
  });
});

describe("UI-OVL-002 the CSV import stays open while the import runs", () => {
  it.each(CONSUMERS)("UI-OVL-002 %s stays open on Escape, the backdrop and back, with no file input", async (_, consumer) => {
    const { u, dialog } = await openImport(consumer, "held");
    await importFile(u, dialog);
    await within(dialog).findByText(/^Importando/);

    const stillOpen = () => expect(screen.getByRole("dialog", { name: consumer.title })).toBe(dialog);

    // On the dialog itself: the button that had focus is gone.
    fireEvent.keyDown(dialog, { key: "Escape" });
    stillOpen();
    // Structural: the backdrop has no role or name; it is MUI's own element.
    await u.click(document.querySelector(".MuiBackdrop-root") as HTMLElement);
    stillOpen();
    await pressBack();

    stillOpen();
    expect(within(dialog).queryByLabelText("Seleccionar archivo CSV")).not.toBeInTheDocument();
    expect(within(dialog).queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });
});

const GUIDE_CLOSE_ATTEMPTS = [
  ["Cancelar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cancelar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

const RESULT_CLOSE_ATTEMPTS = [
  ["Cerrar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cerrar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

describe.each(CONSUMERS)("UI-OVL-003 %s asks before discarding a chosen file", (_, consumer) => {
  it.each(GUIDE_CLOSE_ATTEMPTS)("UI-OVL-003 with a file chosen, %s asks first and keeps the guide", async (__, attempt) => {
    const { u, dialog } = await openImport(consumer);
    await chooseFile(u, dialog);

    await attempt(u, dialog);

    expect(within(dialog).getByRole("alert")).toHaveTextContent(DISCARD_QUESTION);
    expect(screen.getByRole("dialog", { name: consumer.title })).toBe(dialog);
    expect(within(dialog).getByText("datos.csv")).toBeInTheDocument();
  });

  it.each(GUIDE_CLOSE_ATTEMPTS)("UI-OVL-003 with no file chosen, %s closes directly", async (__, attempt) => {
    const { u, dialog } = await openImport(consumer);

    await attempt(u, dialog);

    await closed();
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });

  it.each(RESULT_CLOSE_ATTEMPTS)("UI-OVL-003 on the result, %s closes directly", async (__, attempt) => {
    const { u, dialog } = await showResult(consumer);

    await attempt(u, dialog);

    await closed();
    expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
  });
});

describe.each(CONSUMERS)("UI-OVL-010 %s offers one Cerrar on its result", (_, consumer) => {
  it("UI-OVL-010 the guide keeps the overlay's close icon beside Cancelar", async () => {
    const { dialog } = await openImport(consumer);

    expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
  });

  it("UI-OVL-010 the result offers exactly one Cerrar, and stays named by its title", async () => {
    const { dialog } = await showResult(consumer);

    expect(within(dialog).getAllByRole("button", { name: "Cerrar" })).toHaveLength(1);
    expect(dialog).toHaveAccessibleName(consumer.title);
  });

  it.each(RESULT_CLOSE_ATTEMPTS)("UI-OVL-010 on the result, %s closes it", async (__, attempt) => {
    const { u, dialog } = await showResult(consumer);

    await attempt(u, dialog);

    await closed();
  });
});

describe("UI-OVL-006 the CSV import is named by its title", () => {
  it.each(CONSUMERS)("UI-OVL-006 %s is a dialog named by the heading it shows", async (_, consumer) => {
    const { dialog } = await openImport(consumer);

    expect(within(dialog).getByRole("heading", { name: consumer.title })).toBeInTheDocument();
    expect(dialog).toHaveAccessibleName(consumer.title);
  });
});

describe("UI-OVL-007 the CSV import's result scrolls in the body", () => {
  it.each(CONSUMERS)("UI-OVL-007 %s scrolls its failed rows with the body, the footer outside it", async (_, consumer) => {
    const { dialog } = await showResult(consumer);

    const list = within(dialog).getByRole("list", { name: consumer.failedRowsHeading });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    const scrolling = scrollingAncestors(list, dialog);
    expect(scrolling).toHaveLength(1);
    const [body] = scrolling;
    for (const button of [
      within(dialog).getByRole("button", { name: "Importar otro archivo" }),
      within(dialog).getByRole("button", { name: "Cerrar" }),
    ]) {
      expect(body).not.toContainElement(button);
    }
  });
});

describe.each(CONSUMERS)("UI-OVL-009 focus follows each step of %s", (_, consumer) => {
  const focusIsIn = (dialog: HTMLElement) => expect(dialog).toContainElement(document.activeElement as HTMLElement);

  it("UI-OVL-009 the progress takes focus when the import starts", async () => {
    const { u, dialog } = await openImport(consumer, "held");

    await importFile(u, dialog);

    const progress = (await within(dialog).findByText(/^Importando/)).closest('[role="status"]');
    expect(progress).toHaveFocus();
    focusIsIn(dialog);
  });

  it("UI-OVL-009 the result's summary takes focus when the import answers", async () => {
    const { dialog } = await showResult(consumer);

    expect(within(dialog).getByText(consumer.summary, VISIBLE).closest('[role="note"]')).toHaveFocus();
    focusIsIn(dialog);
  });

  it("UI-OVL-009 «Importar otro archivo» gives focus to «Seleccionar archivo CSV»", async () => {
    const { u, dialog } = await showResult(consumer);

    await u.click(within(dialog).getByRole("button", { name: "Importar otro archivo" }));

    expect(within(dialog).getByRole("button", { name: "Seleccionar archivo CSV" })).toHaveFocus();
    focusIsIn(dialog);
  });

  it("UI-OVL-009 a file refused as a whole gives focus to the refusal", async () => {
    const { u, dialog } = await openImport(consumer, "refused");

    await importFile(u, dialog);

    const refusal = await within(dialog).findByRole("alert");
    expect(refusal).toHaveFocus();
    focusIsIn(dialog);
  });
});

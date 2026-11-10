import "@testing-library/jest-dom";
import { useState, type ReactElement } from "react";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { declaredStyles, pressBack, scrollingAncestors, stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../ResponsiveOverlay/overlayHistory";
import { buildSupply } from "../../test/fixtures";
import { getAllSupplies } from "../../api/supplies/supplies";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  type SharingAgreementPartitionCoefficientResponse,
} from "../../api/models";
import { getGroupedApiErrorDetails } from "../../errors/apiErrorCatalogue";
import { AppModal } from "./AppModal";
import { DeleteSupplyConfirmationModal } from "./DeleteSupplyConfirmationModal";
import { ApplyCoefficientDateConfirmationModal } from "./ApplyCoefficientDateConfirmationModal";
import { CorrectCoefficientDateConfirmationModal } from "./CorrectCoefficientDateConfirmationModal";
import { CloseCoefficientConfirmationModal } from "./CloseCoefficientConfirmationModal";
import { SharingAgreementFormDialog } from "../SharingAgreementFormDialog/SharingAgreementFormDialog";
import { SharingAgreementGenerateDialog } from "../SharingAgreementGenerateDialog/SharingAgreementGenerateDialog";
import { SharingAgreementUploadDialog } from "../SharingAgreementUploadDialog/SharingAgreementUploadDialog";
import { AddSupplyDialog } from "../AddSupplyDialog/AddSupplyDialog";
import { DisableSuccessModal } from "./DisableSuccessModal";
import { EnableSuccessModal } from "./EnableSuccesModal";

/**
 * The confirmation and app modals on the shared overlay (#369): their size,
 * their in-flight lock, their unsaved-changes question, their name and where
 * they scroll. The overlay's own behaviour is ResponsiveOverlay.spec.tsx's.
 */

vi.mock(import("../../api/supplies/supplies"), () => ({
  getAllSupplies: vi.fn(),
}));

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN } = SharingAgreementPartitionCoefficientResponseEndState;

const coefficient = (
  id: string,
  applicationState: SharingAgreementPartitionCoefficientResponse["applicationState"],
  validFrom: string | null,
): SharingAgreementPartitionCoefficientResponse => ({
  coefficientId: id,
  supply: { id: `s-${id}`, name: `Vivienda ${id}`, code: `ES${id}` },
  coefficient: 0.5,
  applicationState,
  endState: OPEN,
  validFrom,
  validTo: null,
  endDate: null,
  currentCoefficient: null,
});

type Targets = readonly [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]];
const pendingRow: Targets = [coefficient("c1", PENDING, null)];
const appliedRow: Targets = [coefficient("c1", APPLIED, "2026-01-15T00:00:00Z")];
// A batch sharing one current date opens prefilled with it.
const appliedBatch: Targets = [coefficient("c1", APPLIED, "2026-01-15T00:00:00Z"), coefficient("c2", APPLIED, "2026-01-15T00:00:00Z")];

const DISCARD_QUESTION = "Tienes cambios sin guardar. Si cierras, se perderán.";

beforeEach(() => {
  stubViewport(390);
  vi.mocked(getAllSupplies).mockResolvedValue({
    items: [buildSupply({ id: "s1", name: "Vivienda A", code: "CUPS1" }), buildSupply({ id: "s2", name: "Local B", code: "CUPS2" })],
    number: 0,
    totalPages: 1,
  });
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

async function render(ui: ReactElement) {
  const user = userEvent.setup();
  renderWithProviders(ui);
  await act(() => overlayHistorySettled());
  return user;
}

const deleteSupply = (props: Partial<Parameters<typeof DeleteSupplyConfirmationModal>[0]> = {}) => (
  <DeleteSupplyConfirmationModal isOpen code="ES0031406912345678JN0F" name="Casa de Lucía" onCancel={vi.fn()} onConfirm={vi.fn()} {...props} />
);
const DELETE_SUPPLY_TITLE = /^Eliminar punto de suministro de /;

const agreementForm = (onCancel: () => void = vi.fn()) => (
  <SharingAgreementFormDialog isOpen mode="create" plantName="Planta Sol" initialValues={{ installedPowerKw: 150 }} onCancel={onCancel} onSubmit={vi.fn()} />
);
const AGREEMENT_FORM_TITLE = /^Nuevo acuerdo de reparto (en|de) /;

describe("UI-OVL-001 confirmations and app modals: a sheet below md, a dialog from md up", () => {
  it.each([
    ["the supply deletion confirmation", () => deleteSupply(), DELETE_SUPPLY_TITLE, "440px"],
    ["the sharing agreement form", () => agreementForm(), AGREEMENT_FORM_TITLE, "560px"],
  ] as const)("UI-OVL-001 renders %s as a sheet at 899 px and a dialog of its size at 900 px", async (_, ui, name, width) => {
    stubViewport(899);
    await render(ui());
    expect(screen.getByRole("dialog", { name })).toHaveClass("MuiDrawer-paperAnchorBottom");
    cleanup();
    await act(() => overlayHistorySettled());

    stubViewport(900);
    await render(ui());
    const paper = screen.getByRole("dialog", { name });
    expect(paper).toHaveClass("MuiDialog-paper");
    expect(declaredStyles(paper)).toContain(`width:${width}`);
  });
});

describe("UI-OVL-002 a confirmation holding its request stays open", () => {
  it("UI-OVL-002 the supply deletion stays open on Escape, the backdrop and back while deleting", async () => {
    const onCancel = vi.fn();
    const user = await render(deleteSupply({ isDeleting: true, onCancel }));
    const dialog = screen.getByRole("dialog", { name: DELETE_SUPPLY_TITLE });

    await user.keyboard("{Escape}");
    // Structural: the backdrop has no role or name; it is MUI's own element.
    await user.click(document.querySelector(".MuiBackdrop-root")!);
    await pressBack();

    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});

/** Sets every section of the date field: arrow up on an empty section fills it. */
async function enterDate(user: ReturnType<typeof userEvent.setup>) {
  const sections = screen.getAllByRole("spinbutton");
  for (const section of sections) {
    await user.click(section);
    await user.keyboard("{ArrowUp}");
  }
}

type DirtyCase = {
  ui: (onClose: () => void) => ReactElement;
  name: RegExp | string;
  change: (user: ReturnType<typeof userEvent.setup>) => Promise<void>;
};

const DIRTY_CASES: Array<[string, DirtyCase]> = [
  [
    "the sharing agreement form (a field changed)",
    {
      ui: (onClose) => agreementForm(onClose),
      name: AGREEMENT_FORM_TITLE,
      change: (user) => user.type(screen.getByRole("textbox", { name: /Nombre del acuerdo/ }), "Recálculo"),
    },
  ],
  [
    "the generate dialog (the year changed)",
    {
      ui: (onClose) => (
        <SharingAgreementGenerateDialog isOpen generateFile={{ run: vi.fn(), isPending: false }} regulatoryCode="CAU0001" onClose={onClose} />
      ),
      name: "Generar fichero",
      change: async (user) => {
        const year = screen.getByRole("spinbutton", { name: "Año" });
        await user.clear(year);
        await user.type(year, "2025");
      },
    },
  ],
  [
    "the upload dialog (a file chosen)",
    {
      ui: (onClose) => <SharingAgreementUploadDialog isOpen uploadFile={{ run: vi.fn(), isPending: false }} regulatoryCode="CAU0001" onClose={onClose} />,
      name: /^Importar un fichero que ya tengas/,
      change: (user) =>
        user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "CAU0001_2026.txt", { type: "text/plain" })),
    },
  ],
  [
    "the add-supply picker (the selection changed)",
    {
      ui: (onClose) => <AddSupplyDialog isOpen communityId="community-1" alreadyAddedSupplyIds={new Set()} onCancel={onClose} onConfirm={vi.fn()} />,
      name: "Añadir suministros",
      change: async (user) => user.click(await screen.findByText("Local B")),
    },
  ],
  [
    "the apply date dialog (a date entered)",
    {
      ui: (onClose) => (
        <ApplyCoefficientDateConfirmationModal isOpen coefficients={pendingRow} isPending={false} errorMessages={null} onCancel={onClose} onConfirm={vi.fn()} />
      ),
      name: /^Registrar fecha de aplicación/,
      change: enterDate,
    },
  ],
  [
    "the correct date dialog (the prefilled date changed)",
    {
      ui: (onClose) => (
        <CorrectCoefficientDateConfirmationModal isOpen coefficients={appliedBatch} isPending={false} errorMessages={null} onCancel={onClose} onConfirm={vi.fn()} />
      ),
      name: /^Corregir fecha de aplicación/,
      change: async (user) => {
        await user.click(screen.getAllByRole("spinbutton")[0]);
        await user.keyboard("{ArrowDown}");
      },
    },
  ],
  [
    "the close date dialog (a date entered)",
    {
      ui: (onClose) => (
        <CloseCoefficientConfirmationModal isOpen coefficients={appliedRow} isPending={false} errorMessages={null} onCancel={onClose} onConfirm={vi.fn()} />
      ),
      name: /^Cerrar coeficiente/,
      change: enterDate,
    },
  ],
];

describe("UI-OVL-003 the dialogs with inputs ask before discarding changes", () => {
  describe.each(DIRTY_CASES)("%s", (_, { ui, name, change }) => {
    it.each([
      ["Cancelar", (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Cancelar" }))],
      ["Escape", (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}")],
      ["back", () => pressBack()],
    ] as const)("UI-OVL-003 with changes, %s asks first and keeps the dialog", async (_, attempt) => {
      const onClose = vi.fn();
      const user = await render(ui(onClose));

      await change(user);
      await attempt(user);

      const dialog = screen.getByRole("dialog", { name });
      expect(within(dialog).getByRole("alert")).toHaveTextContent(DISCARD_QUESTION);
      expect(onClose).not.toHaveBeenCalled();
    });

    it("UI-OVL-003 without changes, Cancelar closes directly", async () => {
      const onClose = vi.fn();
      const user = await render(ui(onClose));

      await user.click(screen.getByRole("button", { name: "Cancelar" }));

      expect(onClose).toHaveBeenCalledTimes(1);
      expect(screen.queryByText(DISCARD_QUESTION)).not.toBeInTheDocument();
    });
  });
});

describe("UI-OVL-006 a modal dialog, named by its title or by a label", () => {
  it("UI-OVL-006 an app modal with a title is named by it", async () => {
    await render(
      <AppModal isOpen onClose={vi.fn()} title="Importar">
        x
      </AppModal>,
    );
    expect(screen.getByRole("dialog", { name: "Importar" })).toHaveAttribute("aria-modal", "true");
  });

  it("UI-OVL-006 an app modal with no visible title is named by its label", async () => {
    await render(
      <AppModal isOpen onClose={vi.fn()} label="Punto de suministro deshabilitado">
        <p>El punto de suministro ha sido deshabilitado</p>
      </AppModal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Punto de suministro deshabilitado" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(within(dialog).queryByRole("heading")).not.toBeInTheDocument();
  });

  it("UI-OVL-006 an app modal whose content holds the heading is named by that heading", async () => {
    await render(
      <AppModal isOpen onClose={vi.fn()} labelledBy="outcome-heading" centered>
        <h2 id="outcome-heading">Suministro habilitado</h2>
      </AppModal>,
    );
    expect(screen.getByRole("dialog", { name: "Suministro habilitado" })).toHaveAttribute("aria-modal", "true");
  });

  it("UI-OVL-006 the scope header and the icon stay out of the name", async () => {
    await render(
      <AppModal isOpen onClose={vi.fn()} title="Eliminar planta" scopeHeader={<p>Comunidad · Sol de la Sierra</p>} icon={<span>!</span>}>
        x
      </AppModal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Eliminar planta" });
    expect(within(dialog).getByText("Comunidad · Sol de la Sierra")).toBeInTheDocument();
  });
});

/** A parent that really closes the dialog it holds, so closing is observable. */
function Closable({ children }: { children: (isOpen: boolean, close: () => void) => ReactElement }) {
  const [isOpen, setOpen] = useState(true);
  return children(isOpen, () => setOpen(false));
}

const SUPPLY_CODE = "ES0031406912345678JN0F";
const SUCCESS_DIALOGS = [
  [
    "the supply disable success dialog",
    (isOpen: boolean, close: () => void) => <DisableSuccessModal isOpen={isOpen} onClose={close} code={SUPPLY_CODE} />,
    `El punto de suministro ${SUPPLY_CODE} ha sido deshabilitado`,
  ],
  [
    "the supply enable success dialog",
    (isOpen: boolean, close: () => void) => <EnableSuccessModal isOpen={isOpen} onClose={close} code={SUPPLY_CODE} />,
    `El punto de suministro ${SUPPLY_CODE} ha sido rehabilitado`,
  ],
] as const;

type User = ReturnType<typeof userEvent.setup>;
const CLOSE_ATTEMPTS = [
  ["its Cerrar", (u: User, dialog: HTMLElement) => u.click(within(dialog).getByRole("button", { name: "Cerrar" }))],
  ["Escape", (_: User, dialog: HTMLElement) => fireEvent.keyDown(dialog, { key: "Escape" })],
  ["back", () => pressBack()],
] as const;

const closed = () => waitFor(() => expect(screen.queryByRole("dialog", { hidden: true })).not.toBeInTheDocument());

const rejectedUpload = () =>
  vi.fn().mockResolvedValue({
    success: false,
    groupedErrors: getGroupedApiErrorDetails({
      response: {
        status: 400,
        data: { errors: [{ message: "raw", code: "DISTRIBUTOR_FILE_CUPS_UNKNOWN", params: { line: "3", cups: "ES1" } }] },
      },
    }),
  });
const UPLOAD_TITLE = /^Importar un fichero que ya tengas en /;

async function showRejectedLines() {
  const run = rejectedUpload();
  const user = await render(
    <Closable>
      {(isOpen, close) => (
        <SharingAgreementUploadDialog isOpen={isOpen} uploadFile={{ run, isPending: false }} regulatoryCode="CAU0001" onClose={close} />
      )}
    </Closable>,
  );
  const dialog = screen.getByRole("dialog", { name: UPLOAD_TITLE });
  await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "CAU0001_2026.txt", { type: "text/plain" }));
  await user.click(within(dialog).getByRole("button", { name: "Subir fichero" }));
  await within(dialog).findByText("Errores por línea");
  return { user, dialog };
}

describe("UI-OVL-010 one control named Cerrar", () => {
  describe.each(SUCCESS_DIALOGS)("%s", (_, dialogOf, name) => {
    it("UI-OVL-010 offers exactly one Cerrar, and is named by the sentence it shows", async () => {
      await render(<Closable>{dialogOf}</Closable>);

      const dialog = screen.getByRole("dialog", { name });
      expect(within(dialog).getAllByRole("button", { name: "Cerrar" })).toHaveLength(1);
      expect(within(dialog).getAllByRole("button").map((button) => button.textContent)).toEqual(["Cerrar"]);
    });

    it.each(CLOSE_ATTEMPTS)("UI-OVL-010 %s closes it", async (__, attempt) => {
      const user = await render(<Closable>{dialogOf}</Closable>);
      const dialog = screen.getByRole("dialog", { name });

      await attempt(user, dialog);

      await closed();
    });

    it("UI-OVL-010 as a sheet at 390 px, keeps its grab handle and shows no close icon", async () => {
      await render(<Closable>{dialogOf}</Closable>);

      const sheet = screen.getByRole("dialog", { name });
      expect(sheet).toHaveClass("MuiDrawer-paperAnchorBottom");
      // Structural: the handle is decorative, aria-hidden, with no role or name;
      // it is told apart by its declared size, the one thing that makes it a handle.
      const handles = [...sheet.querySelectorAll('div[aria-hidden="true"]')].filter((element) =>
        /width:36px.*height:4px|height:4px.*width:36px/.test(declaredStyles(element)),
      );
      expect(handles).toHaveLength(1);
      expect(within(sheet).getAllByRole("button").map((button) => button.textContent)).toEqual(["Cerrar"]);
    });
  });

  describe("the sharing agreement upload dialog", () => {
    it("UI-OVL-010 keeps its close icon before a file is rejected, beside its Cancelar", async () => {
      await render(<SharingAgreementUploadDialog isOpen uploadFile={{ run: vi.fn(), isPending: false }} regulatoryCode="CAU0001" onClose={vi.fn()} />);

      const dialog = screen.getByRole("dialog", { name: UPLOAD_TITLE });
      expect(within(dialog).getByRole("button", { name: "Cerrar" })).toBeInTheDocument();
      expect(within(dialog).getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    });

    it("UI-OVL-010 on the rejected lines, offers exactly one Cerrar and stays named by its title", async () => {
      const { dialog } = await showRejectedLines();

      expect(within(dialog).getAllByRole("button", { name: "Cerrar" })).toHaveLength(1);
      expect(dialog).toHaveAccessibleName(UPLOAD_TITLE);
    });

    it.each(CLOSE_ATTEMPTS)("UI-OVL-010 on the rejected lines, %s closes it", async (_, attempt) => {
      const { user, dialog } = await showRejectedLines();

      await attempt(user, dialog);

      await closed();
    });
  });
});

describe("UI-OVL-007 only the body scrolls", () => {
  it("UI-OVL-007 the upload dialog's rejected lines scroll in the body, with the footer outside it", async () => {
    const run = vi.fn().mockResolvedValue({
      success: false,
      groupedErrors: getGroupedApiErrorDetails({
        response: {
          status: 400,
          data: {
            errors: [
              { message: "raw", code: "DISTRIBUTOR_FILE_COEFFICIENT_SUM_INVALID" },
              { message: "raw", code: "DISTRIBUTOR_FILE_CUPS_UNKNOWN", params: { line: "3", cups: "ES1" } },
              { message: "raw", code: "DISTRIBUTOR_FILE_CUPS_UNKNOWN", params: { line: "7", cups: "ES2" } },
            ],
          },
        },
      }),
    });
    const user = await render(<SharingAgreementUploadDialog isOpen uploadFile={{ run, isPending: false }} regulatoryCode="CAU0001" onClose={vi.fn()} />);
    await user.upload(document.querySelector('input[type="file"]') as HTMLInputElement, new File(["x"], "CAU0001_2026.txt", { type: "text/plain" }));
    await user.click(screen.getByRole("button", { name: "Subir fichero" }));
    await screen.findByText("Errores por línea");

    const dialog = screen.getByRole("dialog", { name: /^Importar un fichero que ya tengas/ });
    const scrolling = scrollingAncestors(screen.getByText("Errores por línea"), dialog);
    expect(scrolling).toHaveLength(1);
    const [body] = scrolling;
    expect(body).not.toContainElement(within(dialog).getByRole("button", { name: "Cerrar" }));
  });

  it("UI-OVL-007 the add-supply picker scrolls as one body, its search held at the top", async () => {
    await render(<AddSupplyDialog isOpen communityId="community-1" alreadyAddedSupplyIds={new Set()} onCancel={vi.fn()} onConfirm={vi.fn()} />);
    await screen.findByText("Local B");

    const dialog = screen.getByRole("dialog", { name: "Añadir suministros" });
    const scrolling = scrollingAncestors(screen.getByText("Local B"), dialog);
    expect(scrolling).toHaveLength(1);
    const [body] = scrolling;
    expect(body).not.toContainElement(within(dialog).getByRole("button", { name: /^Añadir/ }));
    // The search's own container is pinned to the top of that body.
    const search = within(body).getByPlaceholderText("Buscar por nombre o CUPS");
    const pinned = [...body.querySelectorAll("*")].find((element) => element.contains(search) && /position:sticky/.test(declaredStyles(element)));
    expect(pinned).toBeDefined();
    await waitFor(() => expect(declaredStyles(pinned!)).toContain("top:0"));
  });
});

describe("an app modal hosting a form", () => {
  it("submits once from the footer's submit button, and once on Enter in a field", async () => {
    const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault());
    const user = await render(
      <AppModal isOpen onClose={vi.fn()} title="Registrar" onSubmit={onSubmit} actions={<button type="submit">Guardar</button>}>
        <input aria-label="Nombre" />
      </AppModal>,
    );
    const dialog = screen.getByRole("dialog", { name: "Registrar" });

    await user.click(within(dialog).getByRole("button", { name: "Guardar" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);

    await user.type(within(dialog).getByRole("textbox", { name: "Nombre" }), "Ana{Enter}");
    expect(onSubmit).toHaveBeenCalledTimes(2);
  });
});

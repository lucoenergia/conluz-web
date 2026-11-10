import "@testing-library/jest-dom";
import type { ReactElement } from "react";
import { act, cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { stubViewport } from "../../test/overlay";
import { overlayHistorySettled } from "../ResponsiveOverlay/overlayHistory";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  type SharingAgreementPartitionCoefficientResponse,
} from "../../api/models";
import { ApplyCoefficientDateConfirmationModal } from "./ApplyCoefficientDateConfirmationModal";
import { CorrectCoefficientDateConfirmationModal } from "./CorrectCoefficientDateConfirmationModal";
import { CloseCoefficientConfirmationModal } from "./CloseCoefficientConfirmationModal";

/**
 * The coefficient date dialogs at a phone's width, where the responsive picker
 * used to open its calendar in a modal of its own over the sheet (#398).
 */

const { PENDING, APPLIED } = SharingAgreementPartitionCoefficientResponseApplicationState;
const { OPEN } = SharingAgreementPartitionCoefficientResponseEndState;

const coefficient = (
  applicationState: SharingAgreementPartitionCoefficientResponse["applicationState"],
  validFrom: string | null,
): SharingAgreementPartitionCoefficientResponse => ({
  coefficientId: "c1",
  supply: { id: "s-c1", name: "Vivienda c1", code: "ESc1" },
  coefficient: 0.5,
  applicationState,
  endState: OPEN,
  validFrom,
  validTo: null,
  endDate: null,
  currentCoefficient: null,
});

type Dialog = {
  render: (onCancel: () => void) => ReactElement;
  title: RegExp;
  confirm: string;
};

const DIALOGS: Array<[string, Dialog]> = [
  [
    "the apply date dialog",
    {
      render: (onCancel) => (
        <ApplyCoefficientDateConfirmationModal isOpen coefficients={[coefficient(PENDING, null)]} isPending={false} errorMessages={null} onCancel={onCancel} onConfirm={vi.fn()} />
      ),
      title: /^Registrar fecha de aplicación en /,
      confirm: "Registrar fecha",
    },
  ],
  [
    "the correct date dialog",
    {
      render: (onCancel) => (
        <CorrectCoefficientDateConfirmationModal isOpen coefficients={[coefficient(APPLIED, "2026-01-15T00:00:00Z")]} isPending={false} errorMessages={null} onCancel={onCancel} onConfirm={vi.fn()} />
      ),
      title: /^Corregir fecha de aplicación en /,
      confirm: "Confirmar y recalcular",
    },
  ],
  [
    "the close dialog",
    {
      render: (onCancel) => (
        <CloseCoefficientConfirmationModal isOpen coefficients={[coefficient(APPLIED, "2026-01-15T00:00:00Z")]} isPending={false} errorMessages={null} onCancel={onCancel} onConfirm={vi.fn()} />
      ),
      title: /^Cerrar coeficiente en /,
      confirm: "Cerrar (baja)",
    },
  ],
];

type User = ReturnType<typeof userEvent.setup>;

beforeEach(() => {
  // A phone: below md, and no fine pointer, the case the responsive picker
  // answered with its mobile variant.
  stubViewport(390);
});

afterEach(async () => {
  cleanup();
  await act(() => overlayHistorySettled());
  vi.unstubAllGlobals();
});

describe.each(DIALOGS)("UI-OVL-011 %s opens its calendar in place, in the sheet at a phone's width", (_, dialog) => {
  async function setup() {
    const user = userEvent.setup();
    const onCancel = vi.fn();
    renderWithProviders(dialog.render(onCancel));
    await act(() => overlayHistorySettled());
    return { user, onCancel, sheet: screen.getByRole("dialog", { name: dialog.title }) };
  }

  const openCalendar = async (user: User, sheet: HTMLElement) => {
    await user.click(within(sheet).getByRole("button", { name: /Elige fecha/ }));
    return screen.findByRole("grid");
  };

  it("UI-OVL-011 opens in place: no second modal dialog over the sheet", async () => {
    const { user, sheet } = await setup();
    expect(sheet).toHaveClass("MuiDrawer-paperAnchorBottom");

    await openCalendar(user, sheet);

    const modals = screen.getAllByRole("dialog").filter((element) => element.getAttribute("aria-modal") === "true");
    expect(modals).toHaveLength(1);
    expect(modals[0]).toBe(sheet);
  });

  it("UI-OVL-011 choosing a date keeps the sheet, the date in its field, and its confirmation", async () => {
    const { user, sheet } = await setup();

    const calendar = await openCalendar(user, sheet);
    // The 1st: never in the future, which every one of these pickers refuses.
    await user.click(within(calendar).getByRole("gridcell", { name: "1" }));

    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: dialog.title })).toBe(sheet);
    expect(within(sheet).getByRole("spinbutton", { name: "Dia" })).toHaveTextContent("01");
    expect(within(sheet).getByRole("button", { name: dialog.confirm })).toBeInTheDocument();
  });

  it("UI-OVL-011 Escape closes the calendar, and leaves the sheet open", async () => {
    const { user, onCancel, sheet } = await setup();
    await openCalendar(user, sheet);
    // Focus sits in the calendar, so the key below reaches the picker first.
    expect(screen.getByRole("grid")).toContainElement(document.activeElement as HTMLElement);

    fireEvent.keyDown(document.activeElement!, { key: "Escape" });

    await waitFor(() => expect(screen.queryByRole("grid")).not.toBeInTheDocument());
    expect(screen.getByRole("dialog", { name: dialog.title })).toBe(sheet);
    expect(onCancel).not.toHaveBeenCalled();
  });
});

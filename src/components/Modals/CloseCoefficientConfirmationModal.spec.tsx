import "@testing-library/jest-dom";
import { describe, expect, test, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { buildCoefficient } from "../../test/fixtures";
import {
  SharingAgreementPartitionCoefficientResponseApplicationState,
  SharingAgreementPartitionCoefficientResponseEndState,
  type SharingAgreementPartitionCoefficientResponse,
} from "../../api/models";
import { CloseCoefficientConfirmationModal } from "./CloseCoefficientConfirmationModal";

/** An applied coefficient left without a successor: the only kind the close action is offered on. */
function orphan(id: string, name: string): SharingAgreementPartitionCoefficientResponse {
  return buildCoefficient({
    coefficientId: id,
    supply: { id: `supply-${id}`, name, code: `ES-${id}` },
    applicationState: SharingAgreementPartitionCoefficientResponseApplicationState.APPLIED,
    endState: SharingAgreementPartitionCoefficientResponseEndState.OPEN_ORPHAN,
  });
}

function renderModal(coefficients: [SharingAgreementPartitionCoefficientResponse, ...SharingAgreementPartitionCoefficientResponse[]]) {
  return renderWithProviders(
    <CloseCoefficientConfirmationModal
      isOpen
      coefficients={coefficients}
      isPending={false}
      errorMessages={null}
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />,
  );
}

describe("CloseCoefficientConfirmationModal", () => {
  test("UI-AGR-008 states that, from the chosen date, the supply stops receiving production in this agreement", () => {
    renderModal([orphan("c1", "Local C")]);

    expect(screen.getByRole("heading", { name: /^Cerrar coeficiente (en|de) / })).toBeInTheDocument();
    expect(
      screen.getByText(
        "A partir de la fecha indicada, este suministro dejará de recibir atribución de producción en este acuerdo. El periodo hasta ese día queda cerrado.",
      ),
    ).toBeInTheDocument();
  });

  test("UI-AGR-008 states the same for every supply when several are closed together", () => {
    renderModal([orphan("c1", "Local C"), orphan("c2", "Nave D")]);

    expect(
      screen.getByText(
        "A partir de la fecha indicada, estos suministros dejarán de recibir atribución de producción en este acuerdo. El periodo hasta ese día queda cerrado.",
      ),
    ).toBeInTheDocument();
  });
});

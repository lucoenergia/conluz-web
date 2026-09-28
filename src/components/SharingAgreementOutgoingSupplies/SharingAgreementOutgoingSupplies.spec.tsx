import { describe, it, expect, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";
import { SharingAgreementReferenceResponseStatus, type SharingAgreementReferenceResponse } from "../../api/models";
import { buildActiveCoefficient } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import type { InForceAgreementPower } from "../../pages/production/sharingAgreementComparison";
import { SharingAgreementOutgoingSupplies, type SharingAgreementOutgoingSuppliesProps } from "./SharingAgreementOutgoingSupplies";

const REPARTO_2024: SharingAgreementReferenceResponse = {
  id: "agreement-2024",
  name: "Reparto 2024",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
};
const REPARTO_AMPLIACION: SharingAgreementReferenceResponse = {
  id: "agreement-ampliacion",
  name: "Reparto ampliación",
  status: SharingAgreementReferenceResponseStatus.PUBLISHED,
};

/** In CUPS order, as the endpoint returns them; one named supply, one without a name. */
const OUTGOING = [
  buildActiveCoefficient({
    id: "active-s4",
    supply: { id: "s4", name: "Garaje D", code: "ES0031300000000004GH" },
    coefficient: 0.125,
    sharingAgreement: REPARTO_2024,
  }),
  buildActiveCoefficient({
    id: "active-s5",
    supply: { id: "s5", name: null, code: "ES0031300000000005IJ" },
    coefficient: 0.05,
    sharingAgreement: REPARTO_AMPLIACION,
  }),
];

const POWER = new Map<string, InForceAgreementPower>([
  [REPARTO_2024.id, { status: "success", installedPowerKw: 80 }],
  [REPARTO_AMPLIACION.id, { status: "success", installedPowerKw: 60 }],
]);

function renderSection(props: Partial<SharingAgreementOutgoingSuppliesProps> = {}) {
  return renderWithProviders(
    <SharingAgreementOutgoingSupplies outgoing={OUTGOING} isError={false} onRetry={vi.fn()} powerByAgreementId={POWER} {...props} />,
  );
}

describe("SharingAgreementOutgoingSupplies", () => {
  it("lists every outgoing supply, expanded, with its in-force coefficient and power, in the order given", () => {
    renderSection();

    expect(screen.getByRole("button", { name: /Salen del reparto \(2\)/ })).toHaveAttribute("aria-expanded", "true");
    const table = screen.getByRole("table", { name: "Salen del reparto (2)" });
    const [, garaje, unnamed] = within(table).getAllByRole("row");

    expect(within(garaje).getByText("Garaje D")).toBeInTheDocument();
    expect(within(garaje).getByText("ES0031300000000004GH")).toBeInTheDocument();
    expect(within(garaje).getByText("Vigente 12,5000 %")).toBeInTheDocument();
    // 0.125 × Reparto 2024's 80 kW.
    expect(within(garaje).getByText("Vigente 10,00 kW")).toBeInTheDocument();

    // No name: the CUPS is the identifier, not repeated beneath it.
    expect(within(unnamed).getAllByText("ES0031300000000005IJ")).toHaveLength(1);
    expect(within(unnamed).getByText("Vigente 5,0000 %")).toBeInTheDocument();
    // 0.05 × Reparto ampliación's 60 kW.
    expect(within(unnamed).getByText("Vigente 3,00 kW")).toBeInTheDocument();
  });

  it("offers no actions", () => {
    renderSection();
    const table = screen.getByRole("table", { name: "Salen del reparto (2)" });
    expect(within(table).queryByRole("button")).not.toBeInTheDocument();
  });

  it("renders the same entries as a list on narrow viewports", () => {
    renderSection();
    const list = screen.getByRole("list", { name: "Salen del reparto (2)" });
    const items = within(list).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    expect(within(items[0]).getByText("Garaje D")).toBeInTheDocument();
    expect(within(items[0]).getByText("Vigente 12,5000 %")).toBeInTheDocument();
    expect(within(items[1]).getByText("Vigente 3,00 kW")).toBeInTheDocument();
  });

  it("shows a dash for a power whose agreement could not be read, and a skeleton while it loads", () => {
    renderSection({
      powerByAgreementId: new Map<string, InForceAgreementPower>([
        [REPARTO_2024.id, { status: "error" }],
        [REPARTO_AMPLIACION.id, { status: "loading" }],
      ]),
    });
    const table = screen.getByRole("table", { name: "Salen del reparto (2)" });
    const [, garaje, unnamed] = within(table).getAllByRole("row");
    expect(within(garaje).getByText("Vigente —")).toBeInTheDocument();
    expect(within(unnamed).getByLabelText("Cargando potencia vigente")).toBeInTheDocument();
  });

  it("renders nothing when no supply leaves (AC9)", () => {
    const { container } = renderSection({ outgoing: [] });
    expect(container).toBeEmptyDOMElement();
  });

  it("reports a failed read inline, with a retry", async () => {
    const onRetry = vi.fn();
    const user = userEvent.setup();
    renderSection({ outgoing: [], isError: true, onRetry });

    expect(screen.getByRole("alert")).toHaveTextContent("No se han podido cargar los puntos que salen del reparto.");
    await user.click(screen.getByRole("button", { name: "Reintentar" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});

import "@testing-library/jest-dom";
import { afterEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import { renderWithProviders } from "../../test/renderWithProviders";
import { DeleteSupplyConfirmationModal } from "./DeleteSupplyConfirmationModal";

const renderModal = () =>
  renderWithProviders(
    <DeleteSupplyConfirmationModal
      isOpen
      code="ES0031406912345678JN0F"
      name="Casa de Lucía"
      ownerName="Lucía Martínez Soler"
      onCancel={vi.fn()}
      onConfirm={vi.fn()}
    />,
  );

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("UI-INT-015 the supply deletion's confirmation names Shelly only when the build enables it", () => {
  it.each([
    ["unset", undefined],
    ["set to false", "false"],
  ])("UI-INT-015 AC17 with the flag %s says what is deleted without naming Shelly", (_, value) => {
    vi.stubEnv("CONLUZ_SHELLY_ENABLED", value);
    renderModal();

    const dialog = screen.getByRole("dialog");
    expect(
      within(dialog).getByText("Se eliminarán también su contrato y sus datos de distribuidora. Esta acción no se puede deshacer."),
    ).toBeInTheDocument();
    expect(within(dialog).queryByText(/Shelly/)).not.toBeInTheDocument();
  });

  it("UI-INT-015 AC17 with the flag set to true names the Shelly device as before", () => {
    vi.stubEnv("CONLUZ_SHELLY_ENABLED", "true");
    renderModal();

    expect(
      within(screen.getByRole("dialog")).getByText(
        "Se eliminarán también su contrato, sus datos de distribuidora y su dispositivo Shelly. Esta acción no se puede deshacer.",
      ),
    ).toBeInTheDocument();
  });
});

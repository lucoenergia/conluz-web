import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { AppModal } from "./AppModal";
import { BasicModal } from "./BasicModal";

describe("BasicModal", () => {
  it("#310 AC2 is a modal dialog named by the heading it is labelled by", () => {
    renderWithProviders(
      <BasicModal isOpen onClose={vi.fn()} labelledBy="heading">
        <h2 id="heading">Importar puntos de suministro</h2>
      </BasicModal>,
    );

    const dialog = screen.getByRole("dialog", { name: "Importar puntos de suministro" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
  });

  it("#310 AC2 is named by its label when no heading names it", () => {
    renderWithProviders(
      <BasicModal isOpen onClose={vi.fn()} label="Aviso">
        <p>El fichero se ha importado.</p>
      </BasicModal>,
    );

    expect(screen.getByRole("dialog", { name: "Aviso" })).toHaveTextContent("El fichero se ha importado.");
  });

  it("#310 AC2 through AppModal, is named by its title", () => {
    renderWithProviders(<AppModal isOpen onClose={vi.fn()} title="Generar fichero" />);

    expect(screen.getByRole("dialog", { name: "Generar fichero" })).toBeInTheDocument();
  });

  it("#310 AC2 through a centered AppModal, is named by its title too", () => {
    renderWithProviders(<AppModal isOpen onClose={vi.fn()} centered title="Hecho" />);

    expect(screen.getByRole("dialog", { name: "Hecho" })).toBeInTheDocument();
  });
});

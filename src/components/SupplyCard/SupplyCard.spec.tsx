import "@testing-library/jest-dom";
import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";

const mockNavigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

import { SupplyCard } from "./SupplyCard";

const MENU_BUTTON = "Más acciones del punto de suministro";

const renderCard = (props: Partial<React.ComponentProps<typeof SupplyCard>> = {}) =>
  renderWithProviders(
    <SupplyCard id="supply-1" code="ES0021000000000000AA" name="Casa" address="Calle Mayor 1" enabled {...props} />,
  );

describe("SupplyCard", () => {
  describe("when the caller may not change the supply", () => {
    it("offers no actions menu", () => {
      renderCard({ canEdit: false });

      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
      expect(screen.queryByText("Editar")).not.toBeInTheDocument();
      expect(screen.queryByText("Deshabilitar")).not.toBeInTheDocument();
    });

    // Withheld by default rather than on request: a card rendered by a caller
    // that forgot the prop must not become the permissive one.
    it("offers no actions menu when it is not told either way", () => {
      renderCard();

      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
    });

    it("still shows the supply and its status", () => {
      renderCard({ canEdit: false, enabled: false });

      expect(screen.getByRole("heading", { name: "Casa" })).toBeInTheDocument();
      expect(screen.getByText("ES0021000000000000AA")).toBeInTheDocument();
      expect(screen.getByText("Inactivo")).toBeInTheDocument();
    });

    // The chevron replaces the menu, so this is the only way in and it has to
    // keep working -- otherwise hiding the menu would strand the card.
    it("still navigates to the supply when the card is clicked", async () => {
      renderCard({ canEdit: false });

      await userEvent.click(screen.getByRole("heading", { name: "Casa" }));

      expect(mockNavigate).toHaveBeenCalledWith("/supply-points/supply-1");
    });
  });

  describe("when the caller may change the supply", () => {
    it("offers the actions menu", async () => {
      renderCard({ canEdit: true, onDisable: vi.fn() });

      await userEvent.click(screen.getByRole("button", { name: MENU_BUTTON }));

      expect(screen.getByText("Editar")).toBeInTheDocument();
      expect(screen.getByText("Deshabilitar")).toBeInTheDocument();
    });

    it("offers Activar instead of Deshabilitar on a disabled supply", async () => {
      renderCard({ canEdit: true, enabled: false, onEnable: vi.fn() });

      await userEvent.click(screen.getByRole("button", { name: MENU_BUTTON }));

      expect(screen.getByText("Activar")).toBeInTheDocument();
      expect(screen.queryByText("Deshabilitar")).not.toBeInTheDocument();
    });

    it("confirms before disabling, and reports success afterwards", async () => {
      const onDisable = vi.fn().mockResolvedValue(true);
      renderCard({ canEdit: true, onDisable });

      await userEvent.click(screen.getByRole("button", { name: MENU_BUTTON }));
      await userEvent.click(screen.getByText("Deshabilitar"));

      expect(onDisable).not.toHaveBeenCalled();

      await userEvent.click(screen.getByRole("button", { name: "Deshabilitar" }));

      expect(onDisable).toHaveBeenCalledWith("supply-1");
      expect(await screen.findByText(/deshabilitado/i)).toBeInTheDocument();
    });

    it("does not report success when the action fails", async () => {
      const onDisable = vi.fn().mockResolvedValue(false);
      renderCard({ canEdit: true, onDisable });

      await userEvent.click(screen.getByRole("button", { name: MENU_BUTTON }));
      await userEvent.click(screen.getByText("Deshabilitar"));
      await userEvent.click(screen.getByRole("button", { name: "Deshabilitar" }));

      expect(screen.queryByText(/deshabilitado/i)).not.toBeInTheDocument();
    });
  });
});

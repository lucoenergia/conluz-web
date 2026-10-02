import "@testing-library/jest-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithProviders } from "../../test/renderWithProviders";
import { PlantCard } from "./PlantCard";

const mockNavigate = vi.fn();

vi.mock(import("react-router"), async (importOriginal) => ({
  ...(await importOriginal()),
  useNavigate: () => mockNavigate,
}));

const MENU_BUTTON = "Más acciones para Planta Norte";

function renderCard(props: Partial<React.ComponentProps<typeof PlantCard>> = {}) {
  return renderWithProviders(
    <PlantCard id="plant-1" code="NE=1" name="Planta Norte" address="Calle Sol 1" totalPower={63} {...props} />,
  );
}

beforeEach(() => {
  mockNavigate.mockClear();
});

describe("PlantCard", () => {
  describe("when the caller may do nothing with the plant", () => {
    it("offers no actions menu", () => {
      renderCard({ canManage: false, canListSharingAgreements: false });

      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
    });

    // Withheld by default rather than on request: a card rendered by a caller
    // that forgot the prop must not become the permissive one.
    it("offers no actions menu when it is not told either way", () => {
      renderCard();

      expect(screen.queryByRole("button", { name: MENU_BUTTON })).not.toBeInTheDocument();
    });

    it("shows the chevron in the menu's place", () => {
      renderCard();

      expect(screen.getByTestId("ChevronRightIcon")).toBeInTheDocument();
    });

    // The chevron replaces the menu, so this is the only way in: without it,
    // hiding the menu would strand the card.
    it("still navigates to the plant when the card is clicked", async () => {
      const user = userEvent.setup();
      const { container } = renderCard();

      await user.click(container.querySelector(".MuiCardContent-root") as HTMLElement);

      expect(mockNavigate).toHaveBeenCalledWith("/production/plant-1");
    });

    it("still shows the plant and its figures", () => {
      renderCard();

      expect(screen.getByText("Planta Norte")).toBeInTheDocument();
      expect(screen.getByText("NE=1")).toBeInTheDocument();
    });
  });

  describe("when the caller may manage the plant", () => {
    it("offers Ver, Editar and Eliminar", async () => {
      const user = userEvent.setup();
      renderCard({ canManage: true });

      await user.click(screen.getByRole("button", { name: MENU_BUTTON }));

      expect(await screen.findByText("Ver")).toBeInTheDocument();
      expect(screen.getByText("Editar")).toBeInTheDocument();
      expect(screen.getByText("Eliminar")).toBeInTheDocument();
      expect(screen.queryByText("Acuerdos de Reparto")).not.toBeInTheDocument();
    });

    it("confirms before deleting, and calls onDelete only once confirmed", async () => {
      const onDelete = vi.fn().mockResolvedValue(true);
      const user = userEvent.setup();
      renderCard({ canManage: true, onDelete });

      await user.click(screen.getByRole("button", { name: MENU_BUTTON }));
      await user.click(await screen.findByText("Eliminar"));

      expect(onDelete).not.toHaveBeenCalled();
      await user.click(await screen.findByRole("button", { name: "Eliminar" }));

      await waitFor(() => expect(onDelete).toHaveBeenCalledWith("plant-1"));
    });

    it("does not report success when the delete failed", async () => {
      const onDelete = vi.fn().mockResolvedValue(false);
      const user = userEvent.setup();
      renderCard({ canManage: true, onDelete });

      await user.click(screen.getByRole("button", { name: MENU_BUTTON }));
      await user.click(await screen.findByText("Eliminar"));
      await user.click(await screen.findByRole("button", { name: "Eliminar" }));

      await waitFor(() => expect(onDelete).toHaveBeenCalled());
      expect(screen.queryByText(/eliminada correctamente/i)).not.toBeInTheDocument();
    });
  });

  describe("when the caller may only open the sharing agreements", () => {
    it("offers Ver and Acuerdos de Reparto, but neither Editar nor Eliminar", async () => {
      const user = userEvent.setup();
      renderCard({ canListSharingAgreements: true });

      await user.click(screen.getByRole("button", { name: MENU_BUTTON }));

      expect(await screen.findByText("Acuerdos de Reparto")).toBeInTheDocument();
      expect(screen.getByText("Ver")).toBeInTheDocument();
      expect(screen.queryByText("Editar")).not.toBeInTheDocument();
      expect(screen.queryByText("Eliminar")).not.toBeInTheDocument();
    });
  });
});

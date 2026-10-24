import "@testing-library/jest-dom";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { DeleteContactChannelConfirmationModal } from "./DeleteContactChannelConfirmationModal";

describe("DeleteContactChannelConfirmationModal", () => {
  it("AC7 names the channel and says the others do not change", () => {
    renderWithProviders(
      <DeleteContactChannelConfirmationModal isOpen label="Tesorería" otherCount={2} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(screen.getByRole("heading", { name: "¿Eliminar el canal «Tesorería»?" })).toBeInTheDocument();
    expect(screen.getByText("Los miembros dejarán de verlo en Contacto. Los otros 2 canales no cambian.")).toBeInTheDocument();
  });

  it("AC7 explains that deleting the only channel leaves the community without contact", () => {
    renderWithProviders(
      <DeleteContactChannelConfirmationModal isOpen label="Oficina" otherCount={0} onCancel={vi.fn()} onConfirm={vi.fn()} />,
    );

    expect(
      screen.getByText(
        "Es el único canal. Si lo eliminas, tu comunidad se quedará sin contacto y los miembros no sabrán cómo contactar con quien la gestiona hasta que añadas otro.",
      ),
    ).toBeInTheDocument();
    expect(screen.queryByText(/no cambian/)).not.toBeInTheDocument();
  });

  it("confirms with Eliminar canal and cancels with Cancelar", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    renderWithProviders(
      <DeleteContactChannelConfirmationModal isOpen label="Oficina" otherCount={1} onCancel={onCancel} onConfirm={onConfirm} />,
    );

    await user.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(onCancel).toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Eliminar canal" }));
    expect(onConfirm).toHaveBeenCalled();
  });
});

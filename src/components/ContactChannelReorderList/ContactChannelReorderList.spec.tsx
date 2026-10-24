import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildContactChannel } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ContactChannelReorderList, type ContactChannelReorderListProps } from "./ContactChannelReorderList";

// Mixed types, in an order that is neither alphabetical nor grouped by type.
const CHANNELS = [
  buildContactChannel({ type: "PHONE", label: "Oficina", value: "+34 978 710 251" }),
  buildContactChannel({ type: "EMAIL", label: "Tesorería", value: "tesoreria@solsierra.test" }),
  buildContactChannel({ type: "ADDRESS", label: "Local de la asociación", value: "Calle Mayor 12, Albarracín" }),
];

function renderList(props: Partial<ContactChannelReorderListProps> = {}) {
  const handlers = { onSave: vi.fn(), onCancel: vi.fn(), onLostRightsClose: vi.fn() };
  const view = renderWithProviders(<ContactChannelReorderList channels={CHANNELS} {...handlers} {...props} />);
  return { ...view, ...handlers };
}

const order = () =>
  within(screen.getByRole("list", { name: "Orden de los canales" }))
    .getAllByRole("listitem")
    .map((item) => item.querySelector("p")?.textContent);

describe("ContactChannelReorderList", () => {
  it("AC8 offers no Subir on the first row and no Bajar on the last", () => {
    renderList();

    expect(screen.queryByRole("button", { name: "Subir Oficina" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bajar Oficina" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Subir Local de la asociación" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Bajar Local de la asociación" })).not.toBeInTheDocument();
  });

  it("AC8 announces each move and keeps focus on the moved channel", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Bajar Oficina" }));

    expect(order()).toEqual(["Tesorería", "Oficina", "Local de la asociación"]);
    expect(screen.getByRole("status")).toHaveTextContent("«Oficina» está ahora en la posición 2 de 3.");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Bajar Oficina" }));
  });

  it("AC8 moves focus to the other button when the moved channel reaches the end", async () => {
    const user = userEvent.setup();
    renderList();

    await user.click(screen.getByRole("button", { name: "Bajar Tesorería" }));

    expect(order()).toEqual(["Oficina", "Local de la asociación", "Tesorería"]);
    expect(screen.getByRole("status")).toHaveTextContent("«Tesorería» está ahora en la posición 3 de 3.");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Subir Tesorería" }));
  });

  it("AC8 sends the full list in the new order only on Guardar orden", async () => {
    const user = userEvent.setup();
    const { onSave } = renderList();

    await user.click(screen.getByRole("button", { name: "Subir Local de la asociación" }));
    await user.click(screen.getByRole("button", { name: "Subir Local de la asociación" }));
    expect(onSave).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Guardar orden" }));
    expect(onSave).toHaveBeenCalledWith([CHANNELS[2], CHANNELS[0], CHANNELS[1]]);
  });

  it("AC8 cancels without saving", async () => {
    const user = userEvent.setup();
    const { onSave, onCancel } = renderList();

    await user.click(screen.getByRole("button", { name: "Bajar Oficina" }));
    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onCancel).toHaveBeenCalled();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("shows Guardando… while saving, and the moves cannot be changed", () => {
    renderList({ status: "saving" });

    expect(screen.getByRole("button", { name: "Guardando…" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Bajar Oficina" })).toBeDisabled();
  });

  it("says the order was not saved, keeping the moves to try again", () => {
    renderList({ status: "failed" });

    expect(screen.getByRole("alert")).toHaveTextContent("No se ha guardado el orden. Inténtalo de nuevo en unos minutos.");
    expect(screen.getByRole("button", { name: "Guardar orden" })).toBeInTheDocument();
  });

  it("after losing the right to edit, offers only Cerrar", async () => {
    const user = userEvent.setup();
    const { onLostRightsClose } = renderList({ status: "lostRights" });

    expect(screen.getByRole("alert")).toHaveTextContent("Ya no puedes editar el contacto de esta comunidad.");
    expect(screen.queryByRole("button", { name: /^(Subir|Bajar) / })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Guardar orden" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(onLostRightsClose).toHaveBeenCalled();
  });
});

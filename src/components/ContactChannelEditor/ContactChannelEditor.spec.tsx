import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "../../test/renderWithProviders";
import { blankContactChannel, type ContactChannelDraft } from "../../utils/contactChannelRules";
import { ContactChannelEditor, type ContactChannelEditorProps } from "./ContactChannelEditor";

const OFFICE: ContactChannelDraft = {
  type: "PHONE",
  label: "Oficina",
  value: "+34 978 710 251",
  schedule: "Lunes a viernes, de 10:00 a 13:00",
  notes: "",
};

function renderEditor(props: Partial<ContactChannelEditorProps> = {}) {
  const handlers = {
    onSave: vi.fn(),
    onDelete: vi.fn(),
    onClose: vi.fn(),
    onLostRightsClose: vi.fn(),
  };
  const editor = (more: Partial<ContactChannelEditorProps>) => (
    <ContactChannelEditor open mode="edit" initialChannel={OFFICE} communityName="Sol de la Sierra" {...handlers} {...props} {...more} />
  );
  const view = renderWithProviders(editor({}));
  // A refusal arrives after the editor opened and sent the save, never with it.
  const answer = (more: Partial<ContactChannelEditorProps>) => {
    view.rerender(editor({ status: "saving" }));
    view.rerender(editor(more));
  };
  return { ...view, ...handlers, answer };
}

const valueField = () => screen.getByRole("textbox", { name: /Número de teléfono|Email|Dirección/ });

beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

afterEach(() => {
  delete (Element.prototype as Partial<Element>).scrollIntoView;
});

describe("ContactChannelEditor", () => {
  it("edits a stored channel in a dialog titled Editar canal, with its fields filled in", () => {
    renderEditor();

    const dialog = screen.getByRole("dialog", { name: "Editar canal" });
    expect(within(dialog).getByRole("radio", { name: "Teléfono" })).toBeChecked();
    expect(within(dialog).getByRole("textbox", { name: "Nombre del canal" })).toHaveValue("Oficina");
    expect(within(dialog).getByRole("textbox", { name: "Número de teléfono" })).toHaveValue("+34 978 710 251");
    expect(within(dialog).getByRole("button", { name: "Eliminar canal" })).toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Guardar" })).toBeInTheDocument();
  });

  it("AC5 adds a channel as Teléfono, starting at its name, with no delete action", () => {
    renderEditor({ mode: "add", initialChannel: blankContactChannel() });

    const dialog = screen.getByRole("dialog", { name: "Nuevo canal" });
    expect(within(dialog).getByRole("radio", { name: "Teléfono" })).toBeChecked();
    expect(document.activeElement).toBe(within(dialog).getByRole("textbox", { name: "Nombre del canal" }));
    expect(within(dialog).queryByRole("button", { name: "Eliminar canal" })).not.toBeInTheDocument();
    expect(within(dialog).getByRole("button", { name: "Añadir canal" })).toBeInTheDocument();
  });

  it("AC6 adapts the value field to the type, keeping what was typed", async () => {
    const user = userEvent.setup();
    renderEditor();

    const phone = screen.getByRole("textbox", { name: "Número de teléfono" });
    expect(phone).toHaveAttribute("type", "tel");
    expect(phone).toHaveAttribute("inputmode", "tel");
    expect(phone).toHaveAttribute("autocomplete", "tel");

    await user.click(screen.getByRole("radio", { name: "Email" }));
    const email = screen.getByRole("textbox", { name: "Email" });
    expect(email).toHaveValue("+34 978 710 251");
    expect(email).toHaveAttribute("type", "email");
    expect(email).toHaveAttribute("inputmode", "email");
    expect(email).toHaveAttribute("autocapitalize", "none");
    expect(email).toHaveAttribute("autocorrect", "off");

    await user.click(screen.getByRole("radio", { name: "Dirección" }));
    const address = screen.getByRole("textbox", { name: "Dirección" });
    expect(address).toHaveValue("+34 978 710 251");
    expect(address.tagName).toBe("TEXTAREA");
    expect(address).toHaveAttribute("autocomplete", "street-address");
  });

  it("counts the characters of the notes", async () => {
    const user = userEvent.setup();
    renderEditor();

    expect(screen.getByText("0 de 500 caracteres.")).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Notas (opcional)" }), "Llama antes");
    expect(screen.getByText("11 de 500 caracteres.")).toBeInTheDocument();
  });

  it("sends the edited channel on Guardar", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor();

    await user.clear(screen.getByRole("textbox", { name: "Horario (opcional)" }));
    await user.click(screen.getByRole("button", { name: "Guardar" }));

    expect(onSave).toHaveBeenCalledWith({ ...OFFICE, schedule: "" });
  });

  it("AC11 sends nothing with an empty name and a 5-digit phone, shows both errors and focuses the name", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({ mode: "add", initialChannel: blankContactChannel() });

    await user.type(valueField(), "978 71");
    await user.click(screen.getByRole("button", { name: "Añadir canal" }));

    expect(onSave).not.toHaveBeenCalled();
    const name = screen.getByRole("textbox", { name: "Nombre del canal" });
    expect(name).toHaveAttribute("aria-invalid", "true");
    expect(name).toHaveAccessibleDescription("Escribe un nombre para el canal, por ejemplo «Oficina».");
    expect(valueField()).toHaveAccessibleDescription(
      "Escribe al menos 6 cifras. Solo números, espacios y un + al principio.",
    );
    expect(document.activeElement).toBe(name);
  });

  it("re-checks a field in error when it loses focus, after the first attempt", async () => {
    const user = userEvent.setup();
    renderEditor({ mode: "add", initialChannel: blankContactChannel() });

    await user.click(screen.getByRole("button", { name: "Añadir canal" }));
    const name = screen.getByRole("textbox", { name: "Nombre del canal" });
    await user.type(name, "Tesorería");
    await user.tab();

    expect(name).toHaveAttribute("aria-invalid", "false");
  });

  it("places a server refusal on its field and focuses it", () => {
    const { answer } = renderEditor();
    answer({ fieldErrors: { value: "Revisa el email: debe tener la forma nombre@dominio.es." } });

    expect(valueField()).toHaveAccessibleDescription("Revisa el email: debe tener la forma nombre@dominio.es.");
    expect(document.activeElement).toBe(valueField());
  });

  it("AC9 while saving: read-only fields, only Guardando…, and a press sends nothing", async () => {
    const user = userEvent.setup();
    const { onSave } = renderEditor({ status: "saving" });

    expect(screen.getByRole("textbox", { name: "Nombre del canal" })).toHaveAttribute("readonly");
    screen.getAllByRole("radio").forEach((radio) => expect(radio).toBeDisabled());
    expect(screen.queryByRole("button", { name: "Cancelar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Cerrar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar canal" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Guardando…" }));
    expect(onSave).not.toHaveBeenCalled();
  });

  it.each([
    ["serverError", "No se ha guardado el canal. El servidor no ha aceptado los cambios. Tus datos siguen aquí: inténtalo de nuevo en unos minutos."],
    ["offline", "No se ha guardado el canal. No hay conexión. Tus datos siguen aquí: vuelve a pulsar Guardar cuando tengas cobertura."],
  ] as const)("shows a %s refusal at the top, focused, keeping the input and Guardar", (status, text) => {
    const { answer } = renderEditor();
    answer({ status });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(text);
    expect(document.activeElement).toBe(alert);
    expect(screen.getByRole("textbox", { name: "Nombre del canal" })).toHaveValue("Oficina");
    expect(screen.getByRole("button", { name: "Guardar" })).toBeEnabled();
  });

  it("AC13 after losing the right to edit: read-only input, no Guardar, and Cerrar reports it", async () => {
    const user = userEvent.setup();
    const { onLostRightsClose, onClose } = renderEditor({ status: "lostRights" });

    expect(screen.getByRole("alert")).toHaveTextContent(
      "Ya no puedes editar el contacto de esta comunidad. No se han guardado los cambios.",
    );
    expect(screen.getByRole("textbox", { name: "Nombre del canal" })).toHaveAttribute("readonly");
    expect(screen.queryByRole("button", { name: "Guardar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Eliminar canal" })).not.toBeInTheDocument();

    const close = screen.getAllByRole("button", { name: "Cerrar" });
    await user.click(close[close.length - 1]);
    expect(onLostRightsClose).toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  describe("AC10 closing", () => {
    it("closes directly when nothing changed", async () => {
      const user = userEvent.setup();
      const { onClose } = renderEditor();

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it.each([
      ["Cancelar", async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Cancelar" }))],
      ["Cerrar", async (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole("button", { name: "Cerrar" }))],
      ["Esc", async (user: ReturnType<typeof userEvent.setup>) => user.keyboard("{Escape}")],
    ])("asks before closing with changes, from %s", async (_, close) => {
      const user = userEvent.setup();
      const { onClose } = renderEditor();

      await user.type(screen.getByRole("textbox", { name: "Horario (opcional)" }), " y jueves");
      await close(user);

      expect(onClose).not.toHaveBeenCalled();
      expect(screen.getByRole("alert")).toHaveTextContent("Tienes cambios sin guardar en este canal. Si cierras, se perderán.");
      expect(screen.getByRole("button", { name: "Seguir editando" })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Descartar cambios" })).toBeInTheDocument();
    });

    it("keeps editing, with focus back on the last field, or discards", async () => {
      const user = userEvent.setup();
      const { onClose } = renderEditor();
      const schedule = screen.getByRole("textbox", { name: "Horario (opcional)" });

      await user.type(schedule, " y jueves");
      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      await user.click(screen.getByRole("button", { name: "Seguir editando" }));

      expect(document.activeElement).toBe(schedule);
      expect(schedule).toHaveValue("Lunes a viernes, de 10:00 a 13:00 y jueves");
      expect(onClose).not.toHaveBeenCalled();

      await user.click(screen.getByRole("button", { name: "Cancelar" }));
      await user.click(screen.getByRole("button", { name: "Descartar cambios" }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  describe("AC15 layout", () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("is a bottom sheet below md", () => {
      renderEditor();

      const dialog = screen.getByRole("dialog", { name: "Editar canal" });
      expect(dialog).toHaveClass("MuiDrawer-paperAnchorBottom");
    });

    it("is a dialog from md up, with the same content", () => {
      // jsdom has no layout: answer every (min-width) query as a desktop would.
      vi.stubGlobal(
        "matchMedia",
        (query: string) =>
          ({
            matches: query.includes("min-width"),
            media: query,
            onchange: null,
            addListener: vi.fn(),
            removeListener: vi.fn(),
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
          }) as MediaQueryList,
      );
      renderEditor();

      const dialog = screen.getByRole("dialog", { name: "Editar canal" });
      expect(dialog).toHaveClass("MuiDialog-paper");
      expect(within(dialog).getByRole("textbox", { name: "Nombre del canal" })).toHaveValue("Oficina");
      expect(within(dialog).getByRole("button", { name: "Eliminar canal" })).toBeInTheDocument();
    });
  });
});

import "@testing-library/jest-dom";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { buildContactChannel } from "../../test/fixtures";
import { renderWithProviders } from "../../test/renderWithProviders";
import { ContactChannelList } from "./ContactChannelList";
import { contactHref } from "./contactLink";

// Mixed types, in an order that is neither alphabetical nor grouped by type,
// so the order on screen can only come from the list.
const CHANNELS = [
  buildContactChannel({ type: "PHONE", label: "Teléfono de guardia", value: "+34 600 111 222", schedule: "Lunes a viernes, de 9:00 a 14:00" }),
  buildContactChannel({ type: "ADDRESS", label: "Oficina", value: "Carrer de la Pau 12, València" }),
  buildContactChannel({ type: "EMAIL", label: "Correo", value: "hola@solcomun.test", notes: "Respondemos en 48 horas." }),
  buildContactChannel({ type: "PHONE", label: "Administración", value: "600 333 444" }),
];

const channelItems = () =>
  within(screen.getByRole("list", { name: "Canales de contacto" })).getAllByRole("listitem");

describe("ContactChannelList", () => {
  it("UI-CTU-001 shows the channels in the order given, each with its own schedule and notes", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} />);

    const items = channelItems();
    expect(items).toHaveLength(4);
    ["Teléfono de guardia", "Oficina", "Correo", "Administración"].forEach((label, index) => {
      expect(within(items[index]).getByText(label)).toBeVisible();
    });
    expect(within(items[0]).getByText("Lunes a viernes, de 9:00 a 14:00")).toBeVisible();
    expect(within(items[2]).getByText("Respondemos en 48 horas.")).toBeVisible();
    // A schedule or a note belongs to its channel, not to its neighbours.
    expect(within(items[1]).queryByText("Lunes a viernes, de 9:00 a 14:00")).not.toBeInTheDocument();
    expect(within(items[3]).queryByText("Respondemos en 48 horas.")).not.toBeInTheDocument();
  });

  it("UI-CTU-002 links a phone with tel:, spaces stripped and the leading + kept", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} />);

    expect(screen.getByRole("link", { name: "+34 600 111 222" })).toHaveAttribute("href", "tel:+34600111222");
    expect(screen.getByRole("link", { name: "600 333 444" })).toHaveAttribute("href", "tel:600333444");
  });

  it("UI-CTU-002 links an email with mailto:", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} />);

    expect(screen.getByRole("link", { name: "hola@solcomun.test" })).toHaveAttribute("href", "mailto:hola@solcomun.test");
  });

  it("UI-CTU-002 shows an address as text, not as a link", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} />);

    expect(screen.getByText("Carrer de la Pau 12, València")).toBeVisible();
    expect(screen.queryByRole("link", { name: "Carrer de la Pau 12, València" })).not.toBeInTheDocument();
    expect(screen.getAllByRole("link")).toHaveLength(3);
  });

  it("names each channel's type above its name", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} />);

    const items = channelItems();
    expect(within(items[0]).getByText("Teléfono")).toBeVisible();
    expect(within(items[1]).getByText("Dirección")).toBeVisible();
    expect(within(items[2]).getByText("Email")).toBeVisible();
  });

  it("does not repeat the type when the name already is the type", () => {
    renderWithProviders(
      <ContactChannelList channels={[buildContactChannel({ type: "EMAIL", label: "Email", value: "hola@solcomun.test" })]} />,
    );

    expect(within(channelItems()[0]).getAllByText("Email")).toHaveLength(1);
  });
});

describe("ContactChannelList — edit actions (#296)", () => {
  it("offers no edit action and no heading without onEdit, as members see it", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} />);

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading")).not.toBeInTheDocument();
  });

  it("offers an Editar per channel, named after it, that reports the channel's position", async () => {
    const onEdit = vi.fn();
    renderWithProviders(<ContactChannelList channels={CHANNELS} onEdit={onEdit} />);

    expect(screen.getAllByRole("button", { name: /^Editar / })).toHaveLength(4);
    await userEvent.click(screen.getByRole("button", { name: "Editar Correo" }));

    expect(onEdit).toHaveBeenCalledWith(2);
  });

  it("names each channel by its label and its type, as a heading that can take focus", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} onEdit={vi.fn()} />);

    const heading = screen.getByRole("heading", { level: 3, name: "Oficina, dirección" });
    expect(heading).toHaveAttribute("tabindex", "-1");
    expect(screen.getByRole("heading", { level: 3, name: "Correo, email" })).toBeInTheDocument();
  });

  it("disables every Editar while editDisabled is set", () => {
    renderWithProviders(<ContactChannelList channels={CHANNELS} onEdit={vi.fn()} editDisabled />);

    screen.getAllByRole("button", { name: /^Editar / }).forEach((button) => expect(button).toBeDisabled());
  });
});

describe("contactHref", () => {
  it.each([
    ["PHONE", "+34 600 111 222", "tel:+34600111222"],
    ["PHONE", " 600  333\t444 ", "tel:600333444"],
    ["EMAIL", "hola@solcomun.test", "mailto:hola@solcomun.test"],
    ["ADDRESS", "Carrer de la Pau 12", null],
  ] as const)("UI-CTU-002 turns a %s %j into %j", (type, value, href) => {
    expect(contactHref(type, value)).toBe(href);
  });
});

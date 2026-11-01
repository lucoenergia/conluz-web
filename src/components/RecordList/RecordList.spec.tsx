import "@testing-library/jest-dom";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RecordList, type RecordListItem } from "./RecordList";

const ITEMS: RecordListItem[] = [
  {
    id: "u1",
    title: "Ana García",
    status: <span>Activo</span>,
    fields: [
      { label: "Email", value: "ana@example.com" },
      { label: "Teléfono", value: "600000001" },
    ],
  },
  {
    id: "u2",
    title: "Bruno Leal",
    fields: [{ label: "Email", value: "bruno@example.com" }],
  },
];

describe("RecordList", () => {
  it("renders every record with its fields as label/value pairs", () => {
    render(<RecordList items={ITEMS} label="Usuarios" emptyMessage="Sin usuarios" />);

    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("ana@example.com")).toBeInTheDocument();
    expect(screen.getByText("600000001")).toBeInTheDocument();
    expect(screen.getByText("Bruno Leal")).toBeInTheDocument();
  });

  it("exposes the records as a named list", () => {
    render(<RecordList items={ITEMS} label="Usuarios" emptyMessage="Sin usuarios" />);

    const list = screen.getByRole("list", { name: "Usuarios" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(2);
  });

  it("keeps row actions reachable — the whole point of the stacked layout", () => {
    const onClick = vi.fn();
    render(
      <RecordList
        items={ITEMS}
        label="Usuarios"
        emptyMessage="Sin usuarios"
        rowActions={{ label: (item) => `Más acciones para ${item.title}`, onClick, has: (item) => item.id === "u1" }}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Más acciones para Ana García" }));
    expect(onClick).toHaveBeenCalledWith(expect.anything(), ITEMS[0]);
    expect(screen.queryByRole("button", { name: "Más acciones para Bruno Leal" })).not.toBeInTheDocument();
  });

  it("shows the empty message instead of an empty list", () => {
    render(<RecordList items={[]} label="Usuarios" emptyMessage="No se encontraron usuarios" />);

    expect(screen.getByText("No se encontraron usuarios")).toBeInTheDocument();
    expect(screen.queryByRole("list")).not.toBeInTheDocument();
  });

  it("shows a named progress indicator while loading, not the empty message", () => {
    render(<RecordList items={[]} isLoading label="Usuarios" emptyMessage="No se encontraron usuarios" />);

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
    expect(screen.queryByText("No se encontraron usuarios")).not.toBeInTheDocument();
  });

  it("omits the field list for a record that has no fields", () => {
    render(
      <RecordList
        items={[{ id: "x", title: "Sin datos", fields: [] }]}
        label="Usuarios"
        emptyMessage="Sin usuarios"
      />,
    );

    expect(screen.getByText("Sin datos")).toBeInTheDocument();
  });

  it("renders each of a record's lines on its own row, after the badge", () => {
    render(
      <RecordList
        items={[
          {
            id: "u3",
            title: "Carla Mas",
            badge: <span>Sin invitar</span>,
            lines: ["Miembro · 12345678Z", "carla@example.com"],
            fields: [],
          },
        ]}
        label="Usuarios"
        emptyMessage="Sin usuarios"
      />,
    );

    const item = screen.getByRole("listitem");
    expect(item).toHaveTextContent(/Sin invitar\s*Miembro · 12345678Z\s*carla@example\.com/);
    expect(screen.getByText("carla@example.com")).toBeInTheDocument();
  });

  it("renders a record's selection before its title, and none for a list without selection", () => {
    const { rerender } = render(
      <RecordList
        items={[
          { id: "a", title: "Ana García", selection: <input type="checkbox" aria-label="Seleccionar Ana García" />, fields: [] },
          { id: "b", title: "Bruno Leal", fields: [] },
        ]}
        label="Usuarios"
        emptyMessage="Sin usuarios"
      />,
    );

    const [first, second] = screen.getAllByRole("listitem");
    expect(within(first).getByRole("checkbox", { name: "Seleccionar Ana García" })).toBeInTheDocument();
    expect(within(second).queryByRole("checkbox")).not.toBeInTheDocument();

    rerender(<RecordList items={ITEMS} label="Usuarios" emptyMessage="Sin usuarios" />);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });
});

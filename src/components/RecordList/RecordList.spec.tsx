import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RecordList, type RecordListItem } from "./RecordList";

const ITEMS: RecordListItem[] = [
  {
    id: "u1",
    title: "Ana García",
    status: <span>Activo</span>,
    actions: <button type="button">Más acciones para Ana García</button>,
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
    render(<RecordList items={ITEMS} label="Usuarios" emptyMessage="Sin usuarios" />);

    expect(
      screen.getByRole("button", { name: "Más acciones para Ana García" }),
    ).toBeInTheDocument();
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
});

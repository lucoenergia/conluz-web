import "@testing-library/jest-dom";
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ListTable, type ListTableProps } from "./ListTable";

type Row = { id: string; name: string; selectable: boolean };

const ROWS: Row[] = [
  { id: "a", name: "Ana García", selectable: true },
  { id: "b", name: "Bruno Leal", selectable: false },
];

const baseProps: ListTableProps<Row> = {
  rows: ROWS,
  getRowKey: (row) => row.id,
  title: { header: "Nombre", text: (row) => row.name },
  columns: [],
  isLoading: false,
  rowActions: { label: (row) => `Más acciones para ${row.name}`, onClick: vi.fn() },
};

const selection: ListTableProps<Row>["selection"] = {
  header: <input type="checkbox" aria-label="Seleccionar todo" />,
  render: (row) => (row.selectable ? <input type="checkbox" aria-label={`Seleccionar ${row.name}`} /> : null),
};

describe("ListTable", () => {
  it("renders no selection column without a selection", () => {
    render(<ListTable {...baseProps} />);

    expect(screen.getAllByRole("columnheader")).toHaveLength(2);
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("leads with the selection column: the header's control, and each row's own", () => {
    render(<ListTable {...baseProps} selection={selection} />);

    const headers = screen.getAllByRole("columnheader");
    expect(headers).toHaveLength(3);
    expect(within(headers[0]).getByRole("checkbox", { name: "Seleccionar todo" })).toBeInTheDocument();

    const [, anaRow, brunoRow] = screen.getAllByRole("row");
    expect(within(within(anaRow).getAllByRole("cell")[0]).getByRole("checkbox", { name: "Seleccionar Ana García" }))
      .toBeInTheDocument();
    expect(within(brunoRow).queryByRole("checkbox")).not.toBeInTheDocument();
    expect(within(brunoRow).getAllByRole("cell")).toHaveLength(3);
  });
});
